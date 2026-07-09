CREATE TABLE `scripts` (
	`pathname` text PRIMARY KEY UNIQUE,
	`retry` integer DEFAULT -1 NOT NULL,
	`env` text DEFAULT '{}' NOT NULL
);
