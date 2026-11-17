# 새 업무 포털 Firebase Realtime Database 규칙

기존 운영 데이터는 `hareharePortal/shared`, `hareharePortal/private`, `hareharePortal/identity`에 그대로 둡니다. 새 포털은 **`hareharePortal/next`**만 사용합니다. Firebase 콘솔의 현재 규칙에서 `rules.hareharePortal` 아래에 다음 `"next"` 블록을 추가하세요. 현재 규칙의 다른 키를 지우거나 전체 파일을 아래 내용으로 교체하면 기존 기능이 중단될 수 있습니다.

```json
"next": {
  ".read": true,
  "config": {
    ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
    ".validate": "newData.child('version').val() === 2"
  },
  "orders": {
    "$date": {
      ".validate": "$date.matches(/^\\d{4}-\\d{2}-\\d{2}$/)",
      "$store": {
        ".write": "auth !== null && newData.exists() && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || root.child('hareharePortal/identity/profiles/'+auth.uid+'/active').val() === true) && ($store === 'doan' || $store === 'dunsan' || $store === 'galleria' || $store === 'yuseong' || $store === 'kundae' || $store === 'dungok')",
        "$productId": {
          ".validate": "$productId.matches(/^[a-f0-9]{20}$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000 && newData.val() % 1 === 0"
        }
      }
    }
  },
  "production": {
    "$date": {
      ".validate": "$date.matches(/^\\d{4}-\\d{2}-\\d{2}$/)",
      "$productId": {
        ".write": "auth !== null && newData.exists() && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || root.child('hareharePortal/identity/profiles/'+auth.uid+'/active').val() === true)",
        ".validate": "$productId.matches(/^[a-f0-9]{20}$/) && newData.hasChildren(['made','waste','shipments','updatedAt'])",
        "made": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000 && newData.val() % 1 === 0" },
        "waste": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000 && newData.val() % 1 === 0" },
        "updatedAt": { ".validate": "newData.isNumber()" },
        "shipments": {
          "$store": {
            ".validate": "($store === 'doan' || $store === 'dunsan' || $store === 'galleria' || $store === 'yuseong' || $store === 'kundae' || $store === 'dungok') && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000 && newData.val() % 1 === 0"
          }
        }
      }
    }
  },
  "sales": {
    ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
  },
  "posts": {
    ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
  }
}
```

## 확인 순서

1. 현재 Firebase 규칙 전체를 별도로 복사해 보관합니다.
2. 위 블록을 `rules.hareharePortal`의 형제 키로 추가하고 콘솔의 **규칙 게시**를 누릅니다.
3. 새 포털에서 `hare01` 로그인 후 카테고리·제품·게시판을 각각 하나씩 생성합니다.
4. 승인된 Firebase 계정으로 발주와 생산 수량을 저장하고 다른 기기에서 실시간 표시를 확인합니다.
5. POS 자료는 `hare01`에서만 업로드할 수 있습니다.

기존 포털의 로컬 ID만 가진 계정은 새 영역에 쓸 수 없습니다. 발주·생산 입력자는 Firebase Authentication 계정과 `hareharePortal/identity/profiles/{uid}/active: true`가 필요합니다. 이는 브라우저의 ID 표시만으로 쓰기 권한을 부여하지 않기 위한 조건입니다.
