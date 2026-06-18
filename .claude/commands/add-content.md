---
description: 카드/적/유물 등 콘텐츠를 데이터로 추가하고 테스트까지 건다
argument-hint: <추가할 콘텐츠 설명>
---

다음 콘텐츠를 추가한다: **$ARGUMENTS**

절차:
1. **content-designer** 에이전트에 위임한다. 기존 `Effect` 원시로 표현 가능한지
   먼저 판단하게 한다.
2. 기존 원시로 불가능하면(content-designer가 그렇게 보고하면) **engine-dev** 에
   필요한 효과 원시 추가를 위임한 뒤, 다시 content-designer로 콘텐츠를 정의한다.
3. **test-engineer** 로 추가한 콘텐츠의 핵심 동작 테스트를 작성한다.
4. 콘텐츠가 밸런스에 민감하면(새 카드 파워, 새 적) **balance-simulator** 로
   영향을 확인한다.
5. `pnpm typecheck`와 `pnpm test` 통과 확인 후, 추가 항목과 밸런스 근거를 요약한다.
