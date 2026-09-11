# 말씀 추천 데이터와 준비 상태

현재 고유 말씀은 49개, 마음 주제 연결은 52개입니다. 시편 147:3은 슬픔과 관계 주제에 한 항목으로 연결하며 시편 34:18의 기존 세 주제 연결도 보존합니다.

## 본문과 안내 준비 상태

- 기존 3개: 원래 본문·장절·개역한글 번역 정보를 보존합니다. textStatus는 verified, recommendationEnabled는 true, guidanceStatus는 ready, metadataStatus는 reviewed입니다.
- 신규 46개: text는 빈 문자열, textStatus는 pending_verification, textStatusLabel은 본문 검증 대기입니다. 실제 번역본 translation은 null이며 입력 예정 번역은 targetTranslation: 개역개정으로 구분합니다. recommendationEnabled는 false, guidanceStatus는 pending, metadataStatus는 draft입니다.
- 신규 묵상·기도·질문은 작성하지 않았습니다. reflections.js에는 기존 세 항목만 있습니다.
- 신규 contextNote와 추천 설명은 편집 초안입니다. 본문이나 출처 검증 완료를 뜻하지 않습니다.

후보 수집, 직접 선택, 이전 말씀 유지 모두 같은 isActive 검사를 거칩니다. verified 표시와 비어 있지 않은 본문·번역본, 추천 활성화, 안내 준비 완료, 메타데이터 검토 완료가 모두 있어야 실제 추천할 수 있습니다. 본문만 붙여 넣거나 상태 하나만 변경해도 자동 활성화되지 않습니다.

## 말씀 항목

id, reference, text, book, chapter, verseStart, verseEnd, translation을 사용합니다. 구절 ID는 주제와 독립적이며 장절 범위도 한 항목으로 저장합니다. topics는 여러 마음 주제 ID, situations는 적합한 상황 ID, expressions는 실제 입력 예시 배열입니다. recommendationNote는 추천 이유, contextNote는 원문 문맥과 적용 한계입니다.

applicationGuidance.suitableSituations는 추천하기 좋은 상황이고, applicationGuidance.avoidApplications는 피해야 할 적용 방식의 ID입니다. cautionTags는 해당 말씀에서 특히 유의할 적용 방식 표시이며 본문 자체를 무조건 금지하는 표시는 아닙니다.

주제 ID: rest, fear, loneliness, grief, relationship, future, failure, guilt, faith, gratitude.

## 상황 분석과 추천 순서

마음 분석 → 활성 말씀 후보 수집 → 주의사항 확인 → 주제·상황 적합도 및 검토된 문맥 정보 확인 → 비슷하게 적합한 후보 사이의 최근 반복 확인 → 최종 선택.

분석 결과는 primaryTopic, secondaryTopics, situations, riskSignals, uncertainties를 전달합니다. 현재는 규칙 기반이며 감정·위험을 확정하는 진단이 아닙니다. 구체적인 상황은 규칙과 완전히 일치하는 등록 입력 예시를 참고합니다. 대기 항목의 메타데이터가 상황 이해에 쓰여도 그 항목을 추천하지는 않습니다.

결과 상태는 selected, needs_clarification, no_suitable_candidate, safety_first입니다. 추천 보류 때 verse는 null이고 확인 안내를 보여줍니다. 알맞은 후보가 없다고 기본 말씀을 억지로 넣지 않습니다.

## 상황별 주의 규칙

| 주의 표시 | 실제 처리 |
|---|---|
| endurance_pressure | 일반 지침에서는 우선도를 낮추지만 무조건 제외하지 않음. 장기간 선행·노력의 낙심은 적합 상황으로 검토. 심한 소진·휴식 필요는 제외 |
| immediate_forgiveness | 관계 상처에서는 우선도 낮춤. 자발적으로 용서 준비를 표현하면 검토. 새 상처가 확인되면 제외 |
| premature_hope | 슬픔에서는 우선도 낮춤. 사용자가 소망을 이야기할 준비를 표현하면 검토. 최근 상실이면 제외 |
| reconciliation_pressure / endurance_in_danger | 폭력·학대·심한 통제에서는 제외. 공통 안전 안내가 말씀 선택보다 먼저임 |
| forced_gratitude | 슬픔·상처·지침에서는 우선도 낮춤. 최근 상실에서는 제외 |
| faith_shaming 등 | 해당 구절을 금지하지 않고 피해야 할 적용 방식으로 결과에 전달 |
| 알 수 없는 태그 | 규칙 검토 전까지 제외 |

상실 직후나 심한 소진 같은 제외 조건은 사용자의 준비 표현이나 반복 감점보다 우선합니다. 상황이 불확실할 때는 조심스럽게 우선도를 낮추고, 안전 여부를 추측하지 않습니다.

모든 선택에 공통 avoidApplications가 붙습니다. 믿음 부족으로 단정하기, 감정을 억누르기, 인내·용서·감사·화해 강요, 특정 결과 보장, 원문 왜곡, 피해자 책임 전가, 통제 정당화, 책임 면제를 금지합니다. 선택에 applicationTags로 이런 적용 의도를 명시하면 선택을 차단합니다. 자유로운 생성 문장의 의미까지 자동 검증하는 기능은 아니므로 향후 AI 연결 때 이 제약을 전달하고 출력 검증을 별도로 구현해야 합니다.

## 이어지는 대화

같은 마음이나 짧은 확인 응답에는 이전 말씀을 다시 검토하여 유지합니다. 새 상황·주제·위험은 재평가하며 앞선 상황 정보는 같은 대화 안에서 보수적으로 유지합니다. 해결 여부가 확인되지 않은 위험 신호를 다음 한 문장으로 지우지 않습니다. 홈의 큰 입력창에서 새로 제출하면 새 대화입니다.

## 추후 본문 입력과 활성화

사용자가 검증한 본문을 제공한 뒤 실제 번역본·장절·출처를 확인하고 textStatus를 갱신합니다. 문맥·추천 메타데이터와 묵상·기도 안내도 별도로 검토합니다. 개역개정 본문을 활성화하기 전에는 현재 개역한글로 고정된 화면 번역 표시와 외부 본문 링크를 말씀별 정보로 변경해야 합니다. 이번 작업에서는 화면과 링크를 변경하지 않았으며 새 본문도 조회·작성하지 않았습니다.

## 검증

프로젝트 폴더에서 node --test tests/recommendations.test.cjs 를 실행합니다. 49개 고유 항목과 52개 연결, 3개 활성·46개 대기, 빈 본문·안내 대기, 후보/직접 선택/대화 유지의 차단, 상황별 주의 적용을 검사합니다. 테스트의 임시 활성 후보는 기존 검증 본문을 메모리에서 재사용하며 실제 신규 본문이나 안내를 생성하지 않습니다.
