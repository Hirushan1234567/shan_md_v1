# SHAN web (Vercel + Panel)

## Folder
web/index.html + web/style.css (+ web/script.js)  -> landing (/)
web/login.html                                    -> bot login (/login)
web/dashboard.html (+ dashboard-bridge.js)        -> dashboard (/dashboard, login ඕන)
ඔයා වෙනම ෆයිල් විදිහට ලියන්න. Server එක request එකේදී css/js HTML එක ඇතුළට දාලා යවනවා,
ඒ නිසා /style.css වගේ ලින්ක් නෑ. (web/ public නෙවෙයි, ඒ නිසා කෙලින්ම ගන්න බෑ)

## ඔයා දාන්න ඕන ෆයිල්
1. web/script.js  (Web.zip එකේ තිබුණේ නෑ). මේකේ admin password එක hardcode කරලා නෙවෙයි බලන්න.
2. web/dashboard.html = ඔයාගේ V01 Advanced dashboard HTML එක.
   - <section id="v-admin">...</section> සහ #navAdminBtn මකන්න
   - </body> ට කලින්: <script src="dashboard-bridge.js"></script>

## Env: MONGODB_URI, SESSION_SECRET (32+), ADMIN_PASSWORD (8+), OWNER_NUMBER=94752661225
Vercel: import repo -> env -> deploy.   Panel: npm i && node server.js
Admin: owner number එකෙන් login -> Admin -> secret password -> /api/admin?a=page
