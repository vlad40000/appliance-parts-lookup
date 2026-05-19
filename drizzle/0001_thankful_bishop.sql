CREATE TABLE `appliance_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_number` varchar(64) NOT NULL,
	`brand` varchar(128),
	`model_name` varchar(256),
	`appliance_type` varchar(64),
	`dl_parts_lookup_id` varchar(64) NOT NULL,
	`last_fetched` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appliance_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `appliance_models_model_number_unique` UNIQUE(`model_number`)
);
--> statement-breakpoint
CREATE TABLE `diagram_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`model_id` int NOT NULL,
	`section_name` varchar(256) NOT NULL,
	`section_order` int NOT NULL,
	`diagram_image_url` text NOT NULL,
	`diagram_image_key` varchar(256),
	`dl_parts_section_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagram_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`section_id` int NOT NULL,
	`item_number` varchar(64),
	`part_number` varchar(128) NOT NULL,
	`description` text,
	`price` varchar(64),
	`availability` varchar(256),
	`dl_parts_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`model_number` varchar(64) NOT NULL,
	`model_id` int,
	`searched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `diagram_sections` ADD CONSTRAINT `diagram_sections_model_id_appliance_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `appliance_models`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parts` ADD CONSTRAINT `parts_section_id_diagram_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `diagram_sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_model_id_appliance_models_id_fk` FOREIGN KEY (`model_id`) REFERENCES `appliance_models`(`id`) ON DELETE no action ON UPDATE no action;