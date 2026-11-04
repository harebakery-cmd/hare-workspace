# 회원가입 승인용 Firebase Realtime Database 규칙

이 문서는 기존 규칙 전체를 대체하지 않습니다. Firebase 콘솔의 현재 규칙에서 `rules.hareharePortal` 아래에 `identity`를 추가하고, 기존 `rules.hareharePortal.shared.menuConfig[".write"]`만 아래 조건으로 바꿉니다. 다른 데이터 규칙은 유지하세요. 상위 경로에 `.write: true`가 있으면 하위 경로에서 차단할 수 없으므로 먼저 확인해야 합니다.

## identity (hareharePortal 아래)

```json
"identity": {
  "requests": {
    ".read": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
    "$uid": {
      ".read": "auth !== null && auth.uid === $uid",
      ".write": "auth !== null && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || (auth.uid === $uid && !data.exists() && newData.exists() && newData.child('status').val() === 'pending' && newData.child('email').val() === auth.token.email))",
      ".validate": "newData.hasChildren(['id','name','department','jobTitle','email','status','createdAt']) && newData.child('id').isString() && newData.child('id').val() !== 'hare01' && newData.child('name').isString() && newData.child('department').isString() && newData.child('jobTitle').isString() && newData.child('email').isString() && newData.child('status').val() === 'pending' && newData.child('createdAt').isNumber()"
    }
  },
  "profiles": {
    ".read": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
    "$uid": {
      ".read": "auth !== null && auth.uid === $uid",
      ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
    }
  }
}
```

## menuConfig의 .write

```json
".write": "auth !== null && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || (root.child('hareharePortal/identity/profiles/'+auth.uid+'/active').val() === true && root.child('hareharePortal/identity/profiles/'+auth.uid+'/role').val() === 'admin'))"
```

## 작동 확인

1. Firebase Authentication에서 이메일/비밀번호 로그인 제공자가 켜져 있어야 합니다. 이메일 링크 로그인 설정은 필요하지 않습니다.
2. 신청자가 이메일과 비밀번호로 가입하면 Authentication 계정이 생성되고 `identity/requests/<uid>`에 승인 대기 정보가 저장됩니다.
3. 최고관리자 hare01이 계정 관리에서 승인하면 `identity/profiles/<uid>`에 역할이 기록됩니다. 일반 관리자는 계정 변경 권한이 없습니다.
4. 승인 전 로그인은 거부되고, 승인된 관리자의 메뉴 저장만 허용됩니다. 계정 사용 중지는 서버 규칙에서 즉시 메뉴 저장을 막습니다.
5. 기존 브라우저별 수동 계정은 자동 이관되지 않습니다. hare02 같은 기존 아이디를 가입 신청 아이디로 다시 사용할 수 있습니다.

**주의:** 현재 운영 규칙 전문을 확인하기 전에는 이 조각만 붙여넣어 게시하지 마세요. 규칙 위치, 상위 권한, 다른 기능의 규칙을 대조해야 합니다.
