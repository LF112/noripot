CREATE TABLE `scripts` (
	`pathname` text PRIMARY KEY UNIQUE,
	`retry` integer DEFAULT 3 NOT NULL,
	`cron` text
);
