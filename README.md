# Spire-like — 슬레이 더 스파이어 웹 재구현

덱빌딩 로그라이크(슬레이 더 스파이어)를 웹에서 재구현하는 프로젝트.

https://city-kim.github.io/like-slay-the-spire-card-game

## 스택

- **TypeScript 6** — 전 영역
- **순수 TS 게임 엔진** — `src/engine`. DOM/React 비종속, 결정론적(시드 기반 RNG), 단위 테스트 가능.
- **순수 런(run) 레이어** — `src/run`. 전투 위 메타 진행(맵/런/난이도). 전투는 엔진에 위임.
- **React 19 + Vite 8** — `src/ui`. 엔진/런 상태를 그리기만 하는 얇은 표현 계층.
- **Vitest 4** — 엔진/런/콘텐츠/골든 테스트 73개.
- **pnpm 11** — 패키지 매니저.

## 설계 원칙: 엔진과 UI의 분리

핵심은 **"게임 규칙은 UI를 전혀 모른다"**. 전투의 모든 상태 변화는 단 하나의 순수 함수를 통해 일어난다:

```ts
reduce(state: GameState, action: GameAction, rng: RNG): GameState
```

- 입력을 절대 변형(mutate)하지 않고 항상 새 상태를 반환 → React 렌더링과 궁합이 좋고, 디버깅/리플레이가 쉽다.
- 무작위성은 `RNG` 인터페이스 뒤에 격리(`mulberry32` 시드 PRNG) → 같은 시드 = 같은 전투 = 테스트 가능.
- 카드/적은 **데이터**로 정의(`effects` 배열). 대부분의 신규 카드는 엔진 수정 없이 추가된다.

## 디렉터리 구조

```
src/
├── engine/              # 순수 게임 로직 (프레임워크 비종속)
│   ├── types.ts         #   도메인 타입 (Card, Enemy, GameState, Effect, ...)
│   ├── rng.ts           #   시드 PRNG(직렬화 가능) + 셔플
│   ├── cards.ts         #   카드 100장 + 희귀도 + 강화판 + isPlayable
│   ├── enemies.ts       #   적 정의 + 확률적 AI 패턴
│   ├── potions.ts       #   포션 정의
│   ├── internal.ts      #   공유 순수 헬퍼 (상태/데미지/전투원 ref)
│   ├── triggers.ts      #   트리거 버스 — 상태이상 지속/감소 (턴 경계)
│   ├── relics.ts        #   유물 — 전투 이벤트 구독 (시작/카드/턴)
│   ├── combat.ts        #   reduce() 리듀서 — 전투의 단일 진입점
│   ├── combat.test.ts / golden.test.ts  # 엔진 + 골든/리플레이 테스트
│   └── index.ts         #   배럴 export
├── run/                 # 런(run) 레이어 — 전투 위 메타 진행 (순수)
│   ├── types.ts         #   RunState, MapNode, RunAction
│   ├── map.ts           #   절차적 노드 맵 생성 (36행, 시드 결정론)
│   ├── run.ts           #   runReduce() — 맵/전투/보상/상점/이벤트/보스/난이도
│   ├── events.ts        #   랜덤/전투 이벤트 (RunEffect)
│   ├── characters.ts    #   캐릭터 정의 (덱/체력/유물)
│   ├── run.test.ts
│   └── index.ts
├── i18n/                # 국제화 — 엔진은 번역 키만, ko(기본)/en
├── content.test.ts      # 콘텐츠 정의 검증 (카드/적/유물/포션/이벤트 i18n+구조)
├── assets/              # cards/ monsters/ relics/ potions/ nodes/ characters/ ui/ sfx/
└── ui/                  # React 표현 계층
    ├── useRun.ts        #   런 ↔ React 바인딩 + 세이브로드 + 캐릭터 선택 게이트
    ├── RunScreen.tsx    #   런 오케스트레이션 (phase 분기)
    ├── CharacterSelect / MapView / CombatView / RewardView
    ├── RestView / ShopView / EventView / PotionBar
    ├── CardFace / CardTags / useHpPopups   # 카드 표시 + 피해 팝업
    ├── *Images.ts       #   에셋 glob 매핑 (카드/몬스터/유물/포션/노드/캐릭터)
    ├── sound.ts / SoundToggle / runStorage / difficultyStorage
    ├── LanguageSwitcher.tsx
    └── styles.css
```

## 실행

```bash
pnpm install
pnpm dev        # 개발 서버 (Vite)
pnpm test       # 엔진 테스트
pnpm typecheck  # 타입 체크
pnpm build      # 프로덕션 빌드
pnpm sim        # 헤드리스 밸런스 시뮬레이터
```

> 패키지 매니저는 **pnpm**(v11+). `corepack enable` 후 사용 권장.

## 멀티 에이전트 하네스

이 레포에는 게임 개발을 돕는 Claude Code **멀티 에이전트 하네스**가 포함돼 있다
(ECC 패턴 참고). 전문 서브에이전트에 작업을 위임하고 슬래시 커맨드로 워크플로를
오케스트레이션한다.

- 규칙/불변식: [CLAUDE.md](CLAUDE.md)
- 에이전트 카탈로그·오케스트레이션: [.claude/AGENTS.md](.claude/AGENTS.md)
- 에이전트: `feature-planner`, `engine-dev`, `content-designer`, `ui-developer`,
  `test-engineer`, `balance-simulator`, `game-code-reviewer` (`.claude/agents/`)
- 슬래시 커맨드: `/new-feature`, `/add-content`, `/balance-check` (`.claude/commands/`)

예) `/add-content 출혈 시너지 카드 3장` → content-designer가 데이터로 정의 →
test-engineer가 테스트 → 필요 시 balance-simulator가 밸런스 확인.

## 국제화 (i18n)

엔진 순수성 원칙의 연장선 — **표시 텍스트를 엔진에서 완전히 분리**했다.

- 엔진은 표시 문구 대신 **id/번역 키**만 보유한다. 카드 이름은 `card.<id>.name`,
  전투 로그는 `LogEntry { key, params }` 구조로 쌓이고, UI가 활성 언어로 렌더한다.
- 의존성 없는 **타입 안전 경량 i18n**. `ko`(기본)와 `en` 제공. `Resources` 타입이
  로케일 간 키 누락을 컴파일 에러로 잡는다.
- 로그 파라미터는 `{ tkey }`로 다른 키(적/카드 이름)를 **중첩 번역**할 수 있다.
- 우상단 드롭다운으로 언어 전환, 선택은 `localStorage`에 저장.
- **언어 추가**: `src/i18n/locales/<lang>.ts` 파일 하나 추가 → `i18n.ts`의
  `LOCALES`/`LOCALE_NAMES`에 등록. 끝.

```ts
const { t, locale, setLocale } = useTranslation();
t("card.strike.name"); // ko: "타격" / en: "Strike"
t("log.youHit", { enemy: { tkey: "enemy.jawWorm.name" }, dmg: 9 });
```

## 현재 구현된 것

플레이 가능한 슬더스류 로그라이크. **캐릭터 선택 → 36행 맵 → 전투/정예/휴식/보물/상점/이벤트
→ 보스 → 클리어 시 난이도 상승(무한)** 의 완결된 루프.

**전투**
- 드로우(5장) → 카드 플레이(에너지 3) → 턴 종료 → **적이 한 마리씩 순서대로 행동**(스텝) → 반복
- 뽑을/버린/소멸 더미 + 자동 재셔플, 손패 상한 10
- 다중 적 **타겟팅**(단일 공격 적 선택, AoE 즉시), 키보드 조작(1–9 / E / Esc)
- **트리거 버스** — 상태이상 지속/감소(취약·약화·취약방어·중독·금속화·재생), 파워(악마의 형상)
- **적 확률적 AI** — 가중 인텐트 + "같은 수 3연속 금지" + 무브 히스토리

**콘텐츠**
- 카드 **100장**(직업 비종속) + 희귀도(기본/일반/고급/희귀) + `+` 강화판
  + 키워드(Exhaust·Innate·Retain·Ethereal) + **코스트 X**(회오리바람/꼬치꿰기)
- 적 일반 11종 + **보스 2종**(수호자/슬라임왕), 그룹 인카운터
- **다중 캐릭터** 3종(전사/도적/마법사) — 시작 덱·체력·유물 차별화

**메타 진행 (run)**
- 절차적 노드 맵, HP/골드/덱/유물/포션 이월
- 보상(카드 3택1 + 골드 + 포션 확률), 휴식(회복/강화), 상점(구매/제거), 랜덤·전투 이벤트
- **유물** — 전투 시작/카드 플레이/턴 시작 이벤트 구독
- **포션** — 슬롯 3칸, 전투 중 즉시 사용
- **엔드리스 난이도** — 적 기본 체력 1.5배, 클리어마다 난이도 escalate(적 HP/힘 증가)
- **세이브/로드** — 런 상태 + RNG를 localStorage에 자동 저장, 새로고침해도 이어하기

**UX / 엔지니어링**
- i18n(한국어/English) — 엔진은 번역 키만 보유
- 이미지(카드/몬스터/유물/포션/노드/캐릭터/배경), 피해 숫자 팝업, 카드 플레이 연출, 반응형
- 사운드 시스템 구조(에셋 추가 시 자동 재생, 현재 에셋은 TODO)
- 테스트 73개(엔진/런/콘텐츠 검증/카드 골든/시드 리플레이 결정론) + 헤드리스 밸런스 시뮬

## 앞으로 구현할 것 (로드맵)

자세한 작업 목록·상세 구현 현황은 [ROADMAP.md](ROADMAP.md) 참고.
