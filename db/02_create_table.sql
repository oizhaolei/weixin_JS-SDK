drop table if exists `ecs_weixin_account`;
CREATE TABLE `ecs_weixin_account` (
  `openid` varchar(50) NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `portrait` varchar(200) NULL,
  `sex` int(1) DEFAULT 0,
  `language` varchar(10) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `province` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `up_openid` varchar(50) NULL, -- 介绍人
  `telephone` varchar(50) NULL,
  `username` varchar(50) DEFAULT NULL,
  `birthday` varchar(10) DEFAULT NULL,
  `delete_flag` int(1) NOT NULL DEFAULT 0,
  `create_date` datetime(3) NOT NULL,
  `update_date` timestamp NOT NULL default '0000-00-00 00:00:00' on update CURRENT_TIMESTAMP,
  PRIMARY KEY (`openid`),
  KEY (`up_openid`),
  KEY (`delete_flag`),
  KEY (`create_date`)
) Engine=InnoDB AUTO_INCREMENT=5000 DEFAULT CHARSET=utf8mb4;

drop table if exists ecs_weixin_user_knock;
CREATE TABLE `ecs_weixin_user_knock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(50) NULL,
  `create_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY (`openid`),
  KEY (`create_date`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4;





ALTER TABLE `ecs_users` ADD `openid` CHAR(28) AFTER `passwd_answer`;  -- 用户在公众号的openid
ALTER TABLE `ecs_users` ADD `parent_admin_id` smallint(5) unsigned DEFAULT 0 AFTER `openid`; -- 用户的管理者
ALTER TABLE `ecs_users` ADD `portrait` varchar(200) NULL AFTER `openid`;  -- 头像
