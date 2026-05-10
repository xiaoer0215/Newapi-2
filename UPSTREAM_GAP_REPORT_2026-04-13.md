# Official Gap Report

鐢熸垚鏃堕棿: 2026-04-13

## 缁撹鎽樿

杩欎唤鏈湴浠ｇ爜涓嶆槸鈥滅函鏃х増鈥濓紝鑰屾槸鏇存帴杩?

- 瀹樻柟 `v0.11.8`
- 鍔犱笂浣犺嚜宸辩殑浜屽紑
- 鍐嶅姞涓婇儴鍒嗗悗缁畼鏂瑰姛鑳界殑鎵嬪伐鍚堝叆

鎵€浠ュ悗闈㈠崌绾т笉鑳芥寜鈥滄暣浠撳簱鍏ㄩ噺缂哄け鈥濇潵鍒ゆ柇锛岃€岃鎸?

1. 浣犲凡缁忔彁鍓嶅悎杩囩殑瀹樻柟鍔熻兘
2. 瀹樻柟鍚庣画鏂板浣嗕綘鏈湴杩樻病鏈夌殑鍔熻兘
3. 瀹樻柟鍚庣画鐨勫皬淇鍜?UI 鏀硅繘

鏉ュ垎灞傚鐞嗐€?
## 鍒ゆ柇渚濇嵁

- 鏈湴澶ч噺鏂囦欢鏃堕棿鎴抽泦涓湪 `2026-03-22`锛屼笌瀹樻柟 `v0.11.8` 鏃堕棿娈甸珮搴︽帴杩?- 鏈湴瀛樺湪澶氶」 `v0.12.x` 鍚庢墠鍑虹幇鐨勫姛鑳戒唬鐮佺棔杩癸紝璇存槑涓嶆槸鍗曠函鍋滅暀鍦?`v0.11.8`
- 褰撳墠鐩綍娌℃湁 `.git` 鍘嗗彶锛屽洜姝よ繖浠芥姤鍛婃槸鈥渞elease/changelog + 鏈湴浠ｇ爜鐗瑰緛鎵弿鈥濈殑缁撴灉锛屼笉鏄弗鏍肩殑 git 涓夋柟 diff

## 浣犳湰鍦板凡缁忔湁鐨勫畼鏂瑰悗缁兘鍔?
杩欎簺鍔熻兘涓嶅缓璁啀褰撯€滅己鍙ｂ€濅紭鍏堣ˉ:

- Claude `message_delta` usage 淇
  - 璇佹嵁: `relay/channel/claude/relay-claude.go`
- Gemini `:streamGenerateContent` 娴佸紡璇嗗埆
  - 璇佹嵁: `dto/gemini_isstream_test.go`
  - 璇佹嵁: `relay/channel/gemini/adaptor.go`
- `TaskSubmitReq.Duration` 鏀寔
  - 璇佹嵁: `relay/common/relay_info.go`
- Outlook / LOGIN Auth 鍙戜俊鍏煎
  - 璇佹嵁: `common/email.go`
  - 璇佹嵁: `common/email-outlook-auth.go`
- token key 鎵归噺鑾峰彇鍓嶇閫昏緫
  - 璇佹嵁: `web/src/helpers/token.js`
- 閫氳繃鐜鍙橀噺鍚敤閿欒鏃ュ織
  - 璇佹嵁: `common/init.go`
  - 璇佹嵁: `docker-compose.yml`

## 楂樼疆淇″害缂哄彛

涓嬮潰杩欎簺鏄€滃畼鏂?changelog 鏄庣‘鎻愬埌鈥濓紝鍚屾椂鎴戝湪浣犳湰鍦颁唬鐮侀噷娌℃湁鎵惧埌鏄庢樉瀹炵幇鐥曡抗锛屾垨鑰呭綋鍓嶅疄鐜版槑鏄句笉瓒崇殑椤广€?
### P1: 寤鸿浼樺厛琛?
- `v0.12.4` Channel affinity `IncludeModelName`
  - 浠峰€? 褰卞搷娓犻亾浜插拰瑙勫垯鐨勭矑搴?  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌 `IncludeModelName` 瀹炵幇
- `v0.12.4` Web `ErrorBoundary`
  - 浠峰€? 鍓嶇宕╂簝闅旂锛岃兘鍑忓皯鏁撮〉鐧藉睆
  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌涓氬姟渚?`ErrorBoundary` 缁勪欢
- `v0.12.4` Admin user analytics
  - 浠峰€? 绠＄悊鍚庡彴鏁版嵁鍒嗘瀽鑳藉姏
  - 鏈湴鍒ゆ柇: 鍙湅鍒颁簡绔欑偣鍩嬬偣鑴氭湰娉ㄥ叆锛屾病鏈夌湅鍒板悗鍙扮敤鎴峰垎鏋愭ā鍧?- `v0.12.2` OpenAI <-> Claude 鐨?PDF conversion
  - 浠峰€? 褰卞搷鏂囨。/闄勪欢鍏煎鑳藉姏
  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌鏄庢樉 PDF 杞崲瀹炵幇
- `nightly-20260409` 闃舵璁¤垂
  - 浠峰€? 杩欐槸鍚庣画璁¤垂鑳藉姏閲屾渶閲嶇殑涓€鍧?  - 鏈湴鍒ゆ柇: 鏈湅鍒版垚浣撶郴鐨?tiered billing 瀹炵幇

### P2: 鑳藉姏琛ラ綈椤?
- `v0.12.1` HEIC / HEIF 鍥剧墖鏀寔
  - 浠峰€? 鍥剧墖涓婁紶鍏煎鎬?  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌 `HEIC` / `HEIF`
- `v0.12.1` Seedance 2.0 瑙嗛鎺ュ彛
  - 浠峰€? 鏂伴€氶亾鑳藉姏
  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌 `Seedance`
- `v0.12.2` Seedance 2.0 宸紓璁¤垂
  - 浠峰€? 璁¤垂姝ｇ‘鎬?  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌鐩稿叧瀹炵幇
- `v0.12.5` MiniMax 鍥剧墖鐢熸垚 relay
  - 浠峰€? 琛ラ綈 MiniMax 鍥剧墖鑳藉姏
  - 鏈湴鍒ゆ柇: 浣犳湰鍦?`relay/channel/minimax/relay-minimax.go` 鍙湅鍒?chat / audio 璺敱
- `v0.12.6` `vllm-omini` 鑷畾涔夊瓧娈?  - 浠峰€? 閽堝鐗瑰畾涓婃父鍏煎
  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌 `vllm-omini`
- `v0.12.0` `wan2.7-image`
  - 浠峰€? 鏂版ā鍨嬭兘鍔涜ˉ榻?  - 鏈湴鍒ゆ柇: 鏈悳绱㈠埌 `wan2.7` / `wan-2.7`

### P3: 鍙悗琛ョ殑灏忎慨灏忔敼

- `v0.12.7` quota management amount-first + atomic update
  - 鏈湴鍒ゆ柇: 鍙兘缂猴紝浣嗛渶瑕佹洿缁嗙殑鍚庣 diff 鎵嶈兘纭
- `v0.12.7` model pricing role-aware 閿欒鎻愮ず
  - 鏈湴鍒ゆ柇: 鍙兘缂猴紝鍋?UI/浜や簰灞?- `v0.12.8` 閿欒鏃ュ織涓殑 `isStream` 鐘舵€佷慨澶?  - 鏈湴鍒ゆ柇: 褰撳墠鎼滅储鑳界湅鍒?`isStream := false` 鐨勮€侀€昏緫鐥曡抗锛屽缓璁竴璧疯ˉ

## 涓轰粈涔堟湁浜涘畼鏂规洿鏂颁笉绠楃己鍙?
鍥犱负浣犳湰鍦板凡缁忔彁鍓嶅苟杩涙潵浜嗭紝鍏稿瀷渚嬪瓙:

- Claude `message_delta` 缁堝潡 usage 淇
- Gemini `streamGenerateContent` 鍒ゆ祦淇
- `TaskSubmitReq.Duration`
- Outlook `AUTH LOGIN`
- 閿欒鏃ュ織鐜鍙橀噺寮€鍏?
杩欑被椤瑰鏋滃啀鎸夆€滅己鍙ｂ€濆鐞嗭紝瀹规槗閲嶅鍔冲姩銆?
## 鎺ㄨ崘鍗囩骇椤哄簭

### 绗竴鎵? 鍏堣ˉ涓嶄細纰颁綘 UI 涓讳綋鐨勫悗绔兘鍔?
1. `IncludeModelName`
2. PDF conversion
3. HEIC / HEIF
4. Seedance 2.0 鎺ュ彛 + 宸紓璁¤垂
5. MiniMax 鍥剧墖 relay
6. `vllm-omini` 瀛楁
7. `wan2.7-image`

### 绗簩鎵? 鍐嶈ˉ绋冲畾鎬у拰鍚庡彴鑳藉姏

1. Web `ErrorBoundary`
2. Admin user analytics
3. `isStream` 閿欒鏃ュ織淇
4. amount-first / atomic quota update

### 绗笁鎵? 鏈€鍚庣湅浣犳槸鍚﹁杩?nightly

1. 闃舵璁¤垂

杩欏潡鏀瑰姩闈㈡渶澶э紝瀹规槗纰板埌:

- 璁¤垂琛ㄨ揪寮?- UI 閰嶇疆椤?- 娓犻亾娴嬭瘯
- 浠锋牸璁＄畻閾捐矾

濡傛灉浣犲綋鍓嶇嚎涓婅繕娌″己渚濊禆瀹冿紝寤鸿鏈€鍚庡崟鐙仛涓€杞€?
## 瀵逛綘杩欑鈥滀繚鐣欓儴鍒?UI鈥濈殑瀹為檯寤鸿

濡傛灉浣犵幇鍦ㄥ噯澶囧崌绾э紝鎺ㄨ崘杩欐牱鍋?

1. 鍚庣鍔熻兘鍏堝悎
2. 鍓嶇鍏叡閫昏緫鍐嶅悎
3. 鏈€鍚庡彧鎶婁綘鑷繁鐨?UI 椤甸潰閲嶆柊濂楀洖鍘?
鐗瑰埆鏄繖浜涚洰褰曡灏介噺灏戞敼閫昏緫銆佸淇濈暀瀹樻柟鐗堟湰:

- `controller/`
- `service/`
- `dto/`
- `relay/`
- `model/`
- `setting/`

鑰岃繖浜涙洿閫傚悎淇濈暀浣犵殑浜屽紑 UI:

- `web/src/components/layout/`
- `web/src/pages/Home/`
- `web/src/pages/Token/`
- 浣犺嚜宸遍噸鍋氳繃鐨勭櫥褰?浠〃鐩橀〉闈?
## 鏈姤鍛婄殑灞€闄?
- 杩欎笉鏄?git 閫愭彁浜?diff
- 褰撳墠鏈湴鐩綍娌℃湁 `.git` 鍘嗗彶
- 缁撹涓昏鏉ヨ嚜瀹樻柟 changelog 涓庢湰鍦颁唬鐮佺壒寰佹壂鎻?
鍥犳:

- 鈥滃凡瀛樺湪鈥?鍜?鈥滄槑鏄剧己澶扁€?鐨勫垽鏂彲淇″害杈冮珮
- `v0.12.7` / `v0.12.8` 杩欑被鍋忎慨澶嶅瀷鏀瑰姩锛屼粛寤鸿鍚庣画鍐嶅仛涓€娆＄簿缁?diff

## 鍙傝€冩潵婧?
- 瀹樻柟 changelog: https://www.newapi.ai/en/llms.mdx/guide/wiki/changelog
- 瀹樻柟 releases: https://github.com/xiaoer0215/Newapi-2/releases
- 鍏抽敭鐗堟湰:
  - `v0.12.8`
  - `v0.12.7`
  - `v0.12.6`
  - `v0.12.5`
  - `v0.12.4`
  - `v0.12.2`
  - `v0.12.1`
  - `v0.12.0`
  - `nightly-20260409`

