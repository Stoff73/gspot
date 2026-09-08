# gSpot sync on SiteGround

1. Site Tools > MySQL > Databases: create a database and a user with all privileges on it.
2. Site Tools > MySQL > phpMyAdmin: open the database, SQL tab, run `schema.sql`.
3. Copy `config.example.php` to `config.php`, fill in the database name, user, password, a long random token, and the origin the app is served from.
4. Site Tools > File Manager: create `public_html/gspot/` and upload `sync.php` and `config.php` there.
5. In the app, Courses tab > Sync: paste `https://yourdomain/gspot/sync.php` and the token, tap Sync now.

Never commit `config.php` (it is in .gitignore).
