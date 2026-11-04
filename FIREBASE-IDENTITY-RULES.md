# hare-workspace 회원가입 승인 규칙

아래 JSON은 2026-11-04에 사용자가 제공한 Realtime Database 규칙 전문을 기준으로 만들었습니다. 기존 ticker, calendarEvents, bulletin, catalog, orders, production, productionDiary, private/production 조건은 그대로 유지했습니다. `hareharePortal.identity`를 추가하고 `shared.menuConfig[".write"]`만 관리자 승인 상태를 확인하도록 변경했습니다.

Firebase 콘솔 → Realtime Database → 규칙에서 **전체를 교체하여 게시**하세요. 그 사이 운영 규칙을 따로 수정했다면 이 파일로 덮어쓰지 말고 차이를 먼저 확인하세요.

```json
{
  "rules": {
    "hareharePortal": {
      "shared": {
        "ticker": {
          ".read": true,
          ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
        },
        "calendarEvents": {
          ".read": true,
          ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
        },
        "menuConfig": {
          ".read": true,
          ".write": "auth !== null && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || (root.child('hareharePortal/identity/profiles/'+auth.uid+'/active').val() === true && root.child('hareharePortal/identity/profiles/'+auth.uid+'/role').val() === 'admin'))"
        },
        "bulletin": {
          ".read": true,
          ".write": true
        },
        "catalog": {
          ".read": true,
          ".write": true
        },
        "orders": {
          ".read": true,
          "$date": {
            "$store": {
              "$orderId": {
                ".write": "(!data.exists() && newData.exists() && newData.child('deleted').val() !== true && newData.child('savedAt').isString() && newData.child('rows').hasChildren() && $date.matches(/^\\d\\d\\d\\d-\\d\\d-\\d\\d$/) && ($store === 'dunsan' || $store === 'galleria' || $store === 'doan' || $store === 'yuseong' || $store === 'kundae' || $store === 'dungok')) || (auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2')",
                ".validate": "newData.child('savedAt').isString() && (newData.child('deleted').val() === true || newData.child('rows').hasChildren())",
                "rows": {
                  "$productId": {
                    ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000 && newData.val() % 1 === 0"
                  }
                },
                "savedAt": {
                  ".validate": "newData.isString() && newData.val().length <= 40"
                },
                "author": {
                  "displayName": {
                    ".validate": "newData.isString() && newData.val().length <= 120"
                  }
                }
              }
            }
          }
        },
        "production": {
          ".read": true,
          ".write": true
        },
        "productionDiary": {
          ".read": true,
          ".write": true
        }
      },
      "private": {
        "production": {
          ".read": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
          ".write": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'"
        }
      },
      "identity": {
        "requests": {
          ".read": "auth !== null && auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2'",
          "$uid": {
            ".read": "auth !== null && auth.uid === $uid",
            ".write": "auth !== null && (auth.uid === '2gGRDUrXlyNwMpw1xpLA3iH35Fd2' || (auth.uid === $uid && !data.exists() && newData.exists() && newData.child('status').val() === 'pending' && newData.child('email').val() === auth.token.email))",
            ".validate": "newData.hasChildren(['id','name','department','jobTitle','email','status','createdAt']) && newData.child('id').isString() && newData.child('id').val().matches(/^[-_a-zA-Z0-9]{3,32}$/) && newData.child('id').val() !== 'hare01' && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('name').val().length <= 60 && newData.child('department').isString() && newData.child('department').val().length > 0 && newData.child('department').val().length <= 40 && newData.child('jobTitle').isString() && newData.child('jobTitle').val().length > 0 && newData.child('jobTitle').val().length <= 30 && newData.child('email').isString() && newData.child('email').val().length <= 254 && newData.child('status').val() === 'pending' && newData.child('createdAt').isNumber()",
            "id": {
              ".validate": true
            },
            "name": {
              ".validate": true
            },
            "department": {
              ".validate": true
            },
            "jobTitle": {
              ".validate": true
            },
            "email": {
              ".validate": true
            },
            "status": {
              ".validate": true
            },
            "createdAt": {
              ".validate": true
            },
            "$other": {
              ".validate": false
            }
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
    }
  }
}
```

게시 후 최고관리자 hare01로 로그인해 승인 대기 목록이 읽히는지 확인하고, 직급자 테스트 계정 한 개로 신청 → 승인 → 로그인 → 메뉴 저장을 순서대로 검증하세요. Firebase Authentication의 이메일/비밀번호 제공자가 켜져 있어야 합니다. 이메일 링크 인증은 사용하지 않습니다.

기존 hare02 같은 브라우저별 수동 계정은 자동 이관되지 않습니다. 같은 신청 아이디로 가입하더라도 새 이메일·비밀번호 계정은 최고관리자 승인 후 이용합니다.
