# CLAUDE.md — 프로젝트 가이드

슬레이 더 스파이어류 덱빌딩 로그라이크의 웹 재구현. 이 파일은 Claude Code가
**항상 따르는 규칙**과, 작업을 전문 에이전트에 위임하는 방법을 정의한다.

## 패키지 매니저

- **pnpm** (v11+). `npm`/`yarn` 명령을 쓰지 말 것.
- 자주 쓰는 명령: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`.

## 아키텍처 불변식 (반드시 지킬 것)

이 프로젝트의 핵심은 **게임 엔진과 UI의 엄격한 분리**다.

1. **엔진은 순수하다.** `src/engine/**`는 DOM·React·`window`·`Date.now()`·전역
   `Math.random()`을 import하거나 참조하지 않는다. 모든 무작위성은 `RNG`
   인터페이스(`src/engine/rng.ts`)를 통해서만 쓴다.
2. **상태는 불변(immutable).** `reduce(state, action, rng)`는 입력 state를
   변형하지 않고 항상 새 객체를 반환한다. 배열은 `slice()`/스프레드로 복사한다.
3. **결정론.** 같은 `(seed, 액션 시퀀스)`는 항상 같은 결과를 낸다. 이게 테스트와
   밸런스 시뮬레이션의 토대다.
4. **콘텐츠는 데이터다.** 카드·적·(향후)유물·포션은 `effects`/패턴 **데이터**로
   정의한다. 신규 콘텐츠가 엔진 로직 수정을 요구한다면, 먼저 새로운 *효과
   원시(primitive)* 를 엔진에 추가한 뒤 콘텐츠는 그 원시의 조합으로 표현한다.
5. **UI는 얇다.** `src/ui/**`는 엔진 상태를 그리고 액션을 dispatch할 뿐,
   게임 규칙을 재구현하지 않는다.
6. **표시 텍스트는 i18n으로만.** 사용자에게 보이는 문자열을 코드에 하드코딩하지
   않는다. 엔진은 표시 텍스트 대신 **id/번역 키**만 갖는다(카드 이름은
   `card.<id>.name`, 로그는 `LogEntry { key, params }`). 모든 문구는
   `src/i18n/locales/{ko,en}.ts`에 있고, UI는 `useTranslation()`의 `t(key)`로
   렌더한다. 로케일은 **ko가 기본**, en이 보조. 새 키는 **모든 로케일에 동시에**
   추가한다(`Resources` 타입이 누락을 컴파일 에러로 잡는다).

## 변경 후 체크리스트

- 엔진/콘텐츠를 건드렸으면 `pnpm test` + `pnpm typecheck` 통과 확인.
- 새 카드/적/상태이상은 그에 대응하는 테스트를 추가한다.
- `strict` 타입 위반·`any` 도입 금지.

## 에이전트 위임 (멀티 에이전트 하네스)

작업 성격에 맞는 전문 에이전트에 **선제적으로** 위임한다. 독립적인 작업은
병렬로 띄운다. 전체 카탈로그와 오케스트레이션 규칙은 [.claude/AGENTS.md](.claude/AGENTS.md).

| 작업 | 에이전트 |
|---|---|
| 기능 분해·설계 | `feature-planner` |
| 엔진/전투 로직 | `engine-dev` |
| 카드·적·유물 등 콘텐츠 | `content-designer` |
| React UI | `ui-developer` |
| 테스트 작성 | `test-engineer` |
| 밸런스 검증(헤드리스 시뮬) | `balance-simulator` |
| 변경 리뷰 | `game-code-reviewer` |

슬래시 커맨드: `/add-content`, `/new-feature`, `/balance-check`.
