# SHAN Pair Site — Vercel version

Railway pair server එකටම විකල්පයක්. Panel bot (`pair.js` + `index.js`) වෙනස් කරන්න ඕන නැහැ — එකම MongoDB `pair_sessions` collection එක පාවිච්චි කරනවා.

## Deploy
1. `pair-vercel` folder එක GitHub repo එකකට දාන්න
2. vercel.com -> Add New -> Project -> ඒ repo එක import කරන්න (Framework: Other)
3. Environment Variables:
   - `MONGODB_URI` = Panel bot එකේ URI එකම
   - (optional) `RATE_LIMIT=6`, `RATE_WINDOW_MIN=10`
4. Deploy. Project Settings -> Functions එකේ **Fluid Compute** ON ඒකද බලන්න (අලුත් projects වල default ON). ඒක ON නැත්නම් 300s වැඩ කරන්නේ නැහැ.
5. Domain එක ගන්න, ඔයාගේ landing site එකේ `RAILWAY_URL` එකට දාන්න.

## ⚠️ MongoDB Atlas
Vercel IPs වෙනස් වෙනවා. Atlas -> Network Access -> `0.0.0.0/0` allow කරන්න (Panel එකටත් එහෙමම ඕන වෙයි).

## වැඩ කරන විදිය
Pairing එක මුළුමනින්ම `api/pair.js` එක invocation එකක් ඇතුළේ (streaming) වෙනවා: code එක යවනවා -> user code ගහනකල් ඉන්නවා -> session එක MongoDB එකට save කරනවා -> Panel bot එක active වුණාම "Connected" යවනවා. Max ~4.7 විනාඩි.
Users ට වෙන වෙනම invocation නිසා එකවර ගොඩක් දෙනෙකුට පුළුවන්.

## සීමාවන්
- Serverless වල WhatsApp socket එකක් විනාඩි කිහිපයක් open තියාගන්නේ. එය Railway වගේ stable නැහැ. Test කරලා බලන්න; අවුල් නම් Railway version එකම පාවිච්චි කරන්න (Panel එකට වෙනසක් නැහැ).
- Vercel Hobby plan එක non-commercial පාවිච්චියට විතරයි.
