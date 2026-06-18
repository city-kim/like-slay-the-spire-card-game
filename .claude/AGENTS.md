# 멀티 에이전트 하네스

이 프로젝트의 웹게임 개발을 위한 전문 서브에이전트 모음. ECC의 "에이전트 우선 ·
명확한 전문 영역 · 선제적 위임 · 병렬 실행" 패턴을 이 코드베이스에 맞게 적용했다.

각 에이전트는 `.claude/agents/<name>.md`에 정의되며, frontmatter의 `description`을
보고 메인 루프가 자동으로 위임한다.

## 에이전트 카탈로그

| 에이전트 | 영역 | 주로 만지는 곳 |
|---|---|---|
| **feature-planner** | 기능을 단계로 분해, 어느 에이전트가 무엇을 할지 설계 | (읽기 전용) |
| **engine-dev** | 순수 전투 엔진·리듀서·효과 원시·상태이상 | `src/engine/{combat,types,rng}.ts` |
| **content-designer** | 카드/적/유물/포션을 데이터로 정의 + 밸런스 근거 | `src/engine/{cards,enemies}.ts` |
| **ui-developer** | React 표현 계층 | `src/ui/**` |
| **test-engineer** | Vitest 단위·골든·시드 리플레이 테스트 | `src/**/*.test.ts` |
| **balance-simulator** | 엔진을 헤드리스로 돌려 밸런스 통계 수집 | `scripts/sim/**` |
| **game-code-reviewer** | 순수성·결정론·불변성·타입 안전성 리뷰 | (읽기 전용 + 코멘트) |

## 오케스트레이션 규칙

1. **선제적 위임** — 사용자가 명시하지 않아도 작업 성격에 맞는 에이전트를 쓴다.
2. **병렬 실행** — 서로 의존하지 않는 작업(예: 엔진 효과 추가 ↔ UI 스타일)은
   한 번에 여러 에이전트를 띄운다.
3. **계획 먼저** — 여러 계층(엔진+콘텐츠+UI)에 걸친 기능은 `feature-planner`로
   먼저 분해한다.
4. **리뷰 마지막** — 엔진/콘텐츠를 수정한 변경은 머지 전 `game-code-reviewer`에
   통과시킨다.
5. **데이터 흐름** — 새 메커니즘은 보통 이 순서로 흐른다:
   `engine-dev`(효과 원시 추가) → `content-designer`(그 원시로 카드/적 정의 +
   ko/en 로케일 항목) → `test-engineer`(테스트) → `ui-developer`(필요 시 표현, 모든
   문구는 i18n 키) → `game-code-reviewer`.
6. **i18n 불변식** — 사용자에게 보이는 문자열은 코드에 하드코딩하지 않는다.
   엔진은 번역 키만 갖고, 표시 텍스트는 `src/i18n/locales/{ko,en}.ts`에만 둔다.
   새 키는 모든 로케일에 동시에 추가(누락 시 컴파일 에러).

## 전형적인 위임 시나리오

- **"독 상태이상 추가해줘"** → engine-dev(`poison` 원시 + 턴 시작 감소 로직)
  ∥ test-engineer(독 데미지/감소 테스트) → content-designer(독 부여 카드)
  → game-code-reviewer.
- **"새 보스 만들어줘"** → feature-planner → content-designer(보스 정의·인텐트)
  + test-engineer(인텐트 패턴 테스트) → balance-simulator(승률 확인).
- **"전투 UI에 데미지 숫자 팝업"** → ui-developer 단독.
