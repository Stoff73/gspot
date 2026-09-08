-- Run once in phpMyAdmin (SiteGround Site Tools > MySQL > phpMyAdmin) on your gSpot database.
CREATE TABLE IF NOT EXISTS gspot_state (
  id TINYINT UNSIGNED PRIMARY KEY,
  rev INT UNSIGNED NOT NULL DEFAULT 1,
  data LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL
);
