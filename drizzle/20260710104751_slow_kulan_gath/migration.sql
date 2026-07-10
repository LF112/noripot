CREATE TABLE `gateway` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pathname` text NOT NULL,
	`port` integer NOT NULL,
	`path` text NOT NULL,
	CONSTRAINT `fk_gateway_pathname_scripts_pathname_fk` FOREIGN KEY (`pathname`) REFERENCES `scripts`(`pathname`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`context` text NOT NULL,
	`level` text NOT NULL,
	`tags` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scripts` (
	`pathname` text PRIMARY KEY UNIQUE,
	`retry` integer DEFAULT -1 NOT NULL,
	`env` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gateway_script_pathname_idx` ON `gateway` (`pathname`);--> statement-breakpoint
CREATE UNIQUE INDEX `gateway_port_unique` ON `gateway` (`port`);--> statement-breakpoint
CREATE UNIQUE INDEX `gateway_path_unique` ON `gateway` (`path`);--> statement-breakpoint
CREATE INDEX `logs_context_idx` ON `logs` (`context`);--> statement-breakpoint
CREATE INDEX `logs_created_at_idx` ON `logs` (`created_at`);