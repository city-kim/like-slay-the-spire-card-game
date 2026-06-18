---
description: 멀티 계층 기능을 계획→구현→테스트→리뷰로 오케스트레이션한다
argument-hint: <기능 설명>
---

다음 기능을 이 프로젝트의 멀티 에이전트 하네스로 구현한다: **$ARGUMENTS**

절차:
1. **feature-planner** 에이전트로 기능을 분해한다. 영향 계층, 새 효과 원시 필요
   여부, 단계별 담당 에이전트, 불변식 리스크를 받는다.
2. 계획에 따라 위임한다. 서로 의존하지 않는 단계는 **에이전트를 병렬로** 띄운다:
   - 엔진/효과 원시 → `engine-dev`
   - 카드/적/유물 데이터 → `content-designer`
   - React 표현 → `ui-developer`
   - 테스트 → `test-engineer`
3. 엔진/콘텐츠가 바뀌었으면 `balance-simulator`로 밸런스 영향을 확인한다(해당 시).
4. 마지막에 **game-code-reviewer** 로 변경을 리뷰한다. Blocker가 있으면 담당
   에이전트에 되돌려 고친다.
5. `pnpm test`와 `pnpm typecheck` 통과를 최종 확인하고, 무엇을 했는지 요약한다.

CLAUDE.md의 아키텍처 불변식(엔진 순수성·불변성·결정론·데이터 주도)을 항상 지킨다.
