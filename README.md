# 说明
1. fork from https://git.oschina.net/xinshangshangxin/node_JS-SDK_signature.git
2. 对微信公众号相关的测试
3. message
4. weixin pay
5. OAuth

# Installation
 1. 环境设置

“公众号设置”的“JS接口安全域名”
网页授权获取用户基本信息
服务器配置
微信支付 开发配置

 2. cp  config.json.sample config.json
 3. touch cache.json
 4. 微信访问网址  `http://yourserver.com:vport/test.html`

# 常用命令
1.

```sh
rsync -avz --exclude cache.json --exclude .git  --delete -e "ssh -p 22000" ./ zhaolei@test:/work/test/weixin_JS-SDK/;rsync -avz --exclude config.json  --exclude ./cache.json --exclude .git  --delete -e "ssh -p 22000" ./ zhaolei@test:/work/test/weixin_message/
```

2.

```sh
rsync -avz --exclude .git  --delete -e "ssh -p 22000" ../db zhaolei@test:/tmp/
```

3.
