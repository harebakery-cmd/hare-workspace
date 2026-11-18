# 기준정보 초기화용 Firebase 규칙 추가

`hareharePortal/next` 아래의 기존 규칙을 유지하면서 `orders` 및 `production` 노드 맨 위에 다음 `.write`를 추가하세요. `sales`의 최고관리자 `.write`는 기존 규칙을 유지합니다. 전체 JSON을 덮어쓰지 마세요.

```json
"orders": {
  ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
  "$date": { "기존 날짜·지점 규칙": "그대로 유지" }
},
"production": {
  ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
  "$date": { "기존 날짜·제품 규칙": "그대로 유지" }
}
```

위 JSON은 **삽입 위치 설명용**이며 그대로 게시할 수 있는 완성 규칙이 아닙니다. `orders`와 `production`의 기존 자식 규칙은 삭제하지 마세요. `next/config` 및 `next/sales`의 최고관리자 쓰기 규칙도 유지합니다.

엑셀 교체는 `config`, `orders`, `production`, `sales`를 한 번의 다중 경로 업데이트로 변경합니다. 규칙이 빠져 있으면 전체 요청이 거부되어 기존 자료가 유지됩니다. 교체 전에 콘솔의 **현재 데이터 백업**으로 JSON을 보관하고, 미리보기의 오류 행을 모두 해결한 뒤 진행하세요.

