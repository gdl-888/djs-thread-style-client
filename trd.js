const async = require('asyncawait').async;
const await = require('asyncawait').await;

const print = console.log;

const fs = require('fs');
const emoji = require('node-emoji'); 
const DJS11 = require('djs11');
const client = new DJS11.Client();
client.login(fs.readFileSync('./token_helper.txt') + '');

const express = require('express');
const server = express();

const js = fs.readFileSync('./trdjs.js') + '';
var css = ''; if(fs.existsSync('./trdcss.css')) {
	css += fs.readFileSync('./trdcss.css');
}

const msgcount = require('./msgcount.json');

const bodyParser = require('body-parser');

server.use(bodyParser.json({
    limit: '50mb'
}));

server.use(bodyParser.urlencoded({ 
    limit: '50mb',
    extended: false,
}));

client.once('ready', () => {
	client.user.setStatus('invisible');
	print('봇 준비 완료.');
});

const html = {
    escape(content) {
        content = content.replace(/[&]/gi, '&amp;');
        content = content.replace(/["]/gi, '&quot;');
        content = content.replace(/[<]/gi, '&lt;');
        content = content.replace(/[>]/gi, '&gt;');
        
        return content;
    }
};

const available = ch => ch.guild.me.permissionsIn(ch).has('VIEW_CHANNEL');
const membersAvailable = ch => ch.guild.members.filter(member => member.permissionsIn(ch).has('VIEW_CHANNEL'));

function parse(msg, num, flag) {
	try {
		var admin = 0, owner = Number(msg.author.id == msg.guild.ownerID);
		if(msg.member) msg.member.roles.forEach(role => {
			var Permissions = DJS11.Permissions;
			var perm = new Permissions(Number(role.permissions));
			
			if (
				perm.any([
					'ADMINISTRATOR',   'KICK_MEMBERS',     'BAN_MEMBERS', 
					'MANAGE_CHANNELS', 'MANAGE_GUILD',     'PRIORITY_SPEAKER',
					'MANAGE_MESSAGES', 'MUTE_MEMBERS',     'DEAFEN_MEMBERS', 
					'MOVE_MEMBERS',    'MANAGE_NICKNAMES', 'MANAGE_ROLES',
					'MANAGE_WEBHOOKS', 'MANAGE_EMOJIS'
				]) ||
				
				owner
			) {
				admin = 1;
			}
		});
		
		var msgcntnt = (msg.cleanContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/["]/g, '""');
		
		if(msg['embeds'].length) {
			for(var embed of msg['embeds']) {
				msgcntnt += `${embed['title'] || msg.author.username}: ${embed['description']}\n`;
			}
		}
		if(msg['system'] && !msg.reference) {
			switch(msg['type']) {
				case 'GUILD_MEMBER_JOIN':
					msgcntnt = '서버에 참가함.';
				break; case 'PINS_ADD':
					msgcntnt = '메시지를 고정함.';
				break; default:
					msgcntnt = '서버를 부스트했거나 채널 이름이나 아이콘을 변경, 혹은 통화를 시작함.';
			}
		}

		if(!msg['embeds'].length && !msg['system'] && msg['content'].length >= 2) {
			for(var chr=0; chr<msg['content'].length-1; chr++) {
				const emj = String(msg['content'][chr]) + String(msg['content'][chr+1]);
				
				if(emoji.hasEmoji(emj) && emoji.find(emj)['key'] != emj) {
					msgcntnt = msgcntnt.replace(emj, ':' + emoji.find(emj)['key'] + ':');
				}
			}
		}
		
		msg.stickers.forEach(item => msgcntnt += ' [스티커: ' + item.name + ']');
		
		if(msg.reference) {
			flag = '답장';
			msgcntnt += ' [답장하는 메시지: ' + msg.reference.messageID + ']';
		}
		
		msgcntnt = html.escape(msgcntnt);
		
		return `
			<div class=res-wrapper ${flag} data-id=${msg.id} data-visible=false data-locked=false>
				<div class="res res-type-${msg.system && !msg.reference ? 'status' : 'normal'}">
					<div title="메시지 ID: ${msg.id}" class="r-head${owner ? ' first-author' : ''}">
						<a href id=${msg.id} class=num>#${num--}</a>&nbsp;
						<a title="${msg.author.tag} (${msg.author.id})" href="javascript:void(prompt('사용자 ID 복사: ', '${msg.author.id}'));"${admin ? ' style="font-weight: 700;"' : ''}>${msg.author.username}</a>
						
						<span class=pull-right>
							<time datetime="${new Date(msg.createdTimestamp).toISOString()}" data-format="Y-m-d H:i:s"></time>
						</span>
					</div>
					
					<div class=r-body>${msgcntnt.replace(/\n/g, '<br />')}</div>
				</div>
			</div>
		`;
	} catch(e) { print(e); return '' }
}

const render = async(function(title, content, guild, channel) {
	var srvlst = '', chlst = '', thread = '';
	client.guilds.forEach(g => {
		var ch = g.channels
			.filter(ch => ch.type == 'text' || ch.type == 'news')
			.filter(available)
			.random()
			.id;
		
		srvlst += `
			<div>
				<a title="${html.escape(g.name)}" href="/channels/${g.id}/${ch}">
					<img src="${g.iconURL || ''}" alt="${html.escape(g.name[0].toUpperCase())}" style="width: 50px; border-radius: 55px; padding: 6px 3px 6px 3px;${g.iconURL ? '' : ' padding: 17px; border: 1px solid #000; background: gray; color: white;'}" />
				</a>
			</div>
		`;
	});
	client.guilds.get(guild).channels
		.filter(ch => ch.type == 'text' || ch.type == 'news')
		.filter(available)
		.forEach(ch => 
			chlst += `
				<li>
					<a href="/channels/${ch.guild.id}/${ch.id}">${html.escape(ch.name)}</a>
				</li>
			`);
	
	var messages = await (client.channels.get(channel).fetchMessages({
		limit: 100
	})), num = (msgcount[channel] === undefined ? messages.size : msgcount[channel]);
	messages.forEach(msg => thread = parse(msg, num--) + thread);
	
	if(num) thread = `
		<div class="res-wrapper res-loading" oldres data-id=older-${messages.last().id} data-visible=false data-locked=false>
			<div class="res res-type-normal">
				<div class=r-head>
					<a href="javascript:undefined;" class=num>#${num--}</a>&nbsp;
				</div>
				
				<div class=r-body></div>
			</div>
		</div>
	` + thread;
	
	if(!css) css = `
		.r-head span time { color: white }
		.pull-right { float: right }
		td { vertical-align: top }
		
		.res-wrapper {
		margin-top: 20px;
		margin-bottom: 20px;
		}
		.res-wrapper .r-head {
		background: #eee;
		border: 0px solid #068;
		border-style: solid;
		border-color: #068 #068 #068 #068;
		border-radius: 6px 6px 0 0;
		padding: 8px;
		padding-left: 18px;
		padding-right: 18px;
		padding-bottom: 8px;
		padding-top: 8px;
		text-shadow: 1px 1px #000;
		}
		.res-wrapper .r-head.first-author {
		background: #efe;
		}
		.res-wrapper .r-body {
		background: #fafafa;
		border: 0px solid #068;
		border-style: solid;
		border-color: #068 #068 #068 #068;
		border-radius: 0;
		padding: 5px;
		padding-left: 5px;
		padding-right: 5px;
		padding-bottom: 5px;
		padding-top: 5px;
		}
		.res-wrapper .r-body.r-hidden-body {
		background: #333;
		color: #fff
		}
		.more-box {
		border: 1px solid #068;
		border-width: 1px 1px 1px 1px;
		border-style: solid;
		border-color: #068 #068 #068 #068;
		border-radius: 4px;
		padding: 5px;
		padding-left: 5px;
		padding-right: 5px;
		padding-bottom: 5px;
		padding-top: 5px;
		}
		.res-wrapper .r-head {
		  padding: 
			color: #fff !Important;
			background: linear-gradient(to bottom, rgb(128, 191, 237) 0%, rgb(91, 153, 226) 51%, rgb(57,128,210) 50%, rgb(51,103,189) 100%);
		}
		.res-wrapper .r-head.first-author {
			color: #fff !Important;
			background: linear-gradient(to bottom, rgb(81, 116, 168) 0%, rgb(29, 75, 143) 51%, rgb(16,54,122) 50%, rgb(13,53,123) 100%);
		}
		.res-wrapper .r-head a {
		  color: #fff !Important;
		}
		.res.res-type-status .r-body {
		  background-image: linear-gradient(to bottom, #f0ad4e, #ec971f);
		}
		.r-hidden-body .line {
		  border-top: 1px solid #fff;
		}
		.res .r-body {
			padding: 5px 10px 10px 15px;
			background-image: linear-gradient(to bottom, #e8e8e8, #cfcfcf);
			border-radius: 0px;
			display: block;
			max-height: 500px;
		  overflow: scroll;
		}
		.res .r-body.r-hidden-body {
			background-image: linear-gradient(to bottom, #444, #000);
			color: white;
		}
		
		.form-control {
			width: 100%;
		}
	`;
	
	var base = `
		<title>${title}</title>
		<meta charset=utf8 />
		<meta name=guild content="${guild}" />
		<meta name=channel content="${channel}" />
		<script src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
		<script>${js}</script>
		
		<style>
			${css}
		</style>
		
		<body bgcolor=aliceblue style="margin: 0;">
			<table style="width: 100%; height: 100%;">
				<colgroup>
					<col style="width: 80px;" />
					<col style="width: 180px;" />
					<col style="width: 25%;" />
					<col style="width: 25%;" />
					<col style="width: 25%;" />
					<col style="width: 25%;" />
				</colgroup>
				
				<tr>
					<td rowspan=3>
						<div style="overflow-y: scroll; width: 80px; height: calc(100vh - 6px);">
							${srvlst}
						</div>
					</td>
					
					<td rowspan=3>
						<div style="overflow-y: scroll; width: 180px; height: calc(100vh - 6px);">
							<ul class=wiki-list>${chlst}</ul>
						</div>
					</td>
					
					<td style="height: 1px;">
						<label>온라인: </label><br />
						<select size=6 style="width: 100%;" id=online>
							<option value=''>불러오는 중...</option>
						</select>
					</td>
					
					<td>
						<label>자리비움: </label><br />
						<select size=6 style="width: 100%;" id=idle>
							<option value=''>불러오는 중...</option>
						</select>
					</td>
					
					<td>
						<label>다른 용무 중: </label><br />
						<select size=6 style="width: 100%;" id=dnd>
							<option value=''>불러오는 중...</option>
						</select>
					</td>
					
					<td>
						<label>오프라인: </label><br />
						<select size=6 style="width: 100%;" id=offline>
							<option value=''>불러오는 중...</option>
						</select>
					</td>
				</tr>
				
				<tr>
					<!---->
					
					<td colspan=4>
						<!-- <p>${client.channels.get(channel).topic || '주제 없음'}</p> -->
						<div id=res-container style="width: calc(100vw - 275px); overflow-y: scroll; height: calc(100vh - 212px);">
							${thread}
						</div>
					</td>
				</tr>
				
				<tr>
					<!---->
					
					<td rowspan=4 colspan=4>
						<form method=post id=new-thread-form>
							<input placeholder="메시지" type=text class=form-control name=text style="display: inline-block; width: calc(100% - 55px);" />
							<button type=submit style="display: inline-block;">전송</button>
						</form>
					</td>
				</tr>
			</table>
		</body>
	`;
	
	return base;
});

server.get('/', ((req, res) => {
    var ch = client.channels.filter(ch => ch.guild && ['news', 'text'].includes(ch.type)).filter(available).random();
	res.redirect('/channels/' + ch.guild.id + '/' + ch.id);
}));

server.get('/channels/:guildid/:chid', async((req, res) => {
	var guildid = req.params['guildid'];
	var chid = req.params['chid'];
	
	var guild = client.guilds.get(guildid);
	var ch = client.channels.get(chid);
	
	res.send(await (render((ch.topic || ch.name) + ' - ' + guild.name, '', guildid, chid)));
}));

server.post('/channels/:guildid/:chid', async((req, res) => {
	var guildid = req.params['guildid'];
	var chid = req.params['chid'];
	
	var guild = client.guilds.get(guildid);
	var ch = client.channels.get(chid);
	
	ch.send('[사용자발신 R] ' + req.body['text']);
	
	res.status(204).send('');
}));

server.post('/channels/:guildid/:chid/typing', async((req, res) => {
	var guildid = req.params['guildid'];
	var chid = req.params['chid'];
	
	var guild = client.guilds.get(guildid);
	var ch = client.channels.get(chid);
	
	ch.startTyping();
	setTimeout(() => ch.stopTyping(), 6000);
	
	res.status(204).send('');
}));

server.get('/channels/:guildid/:chid/:msgid', async((req, res) => {
	var guildid = req.params['guildid'];
	var chid = req.params['chid'];
	var msgid = req.params['msgid'];
	
	var num = Number(req.query['num']);
	
	var guild = client.guilds.get(guildid);
	var ch = client.channels.get(chid);
	
	var opt = { limit: 100, around: msgid };
	if(msgid.startsWith('older-')) {
		delete opt.around;
		opt.before = msgid.replace('older-', '');
	}
	
	var messages = await (ch.fetchMessages(opt));
	
	var ret = '';
	messages.forEach(msg => ret = parse(msg, num--, msgid.startsWith('older-') ? 'oldres' : '') + ret);
	if(num > 1) {
		ret = `
			<div oldres class="res-wrapper res-loading" data-id=older-${messages.last().id} data-visible=false data-locked=false>
				<div class="res res-type-normal">
					<div class=r-head>
						<a href="javascript:undefined;" class=num>#${num--}</a>&nbsp;
					</div>
					
					<div class=r-body></div>
				</div>
			</div>
		` + ret;
	}
	
	res.send(ret);
}));

server.post('/notify/channels/:guildid/:chid', async((req, res) => {
	var guildid = req.params['guildid'];
	var chid = req.params['chid'];
	
	var guild = client.guilds.get(guildid);
	var ch = client.channels.get(chid);
	
	var lastid = req.query['lastid'];
	
	var ret = [];
	ch.messages.filter(msg => Number(msg.id) > Number(lastid) && Number(msg.id) <= Number(ch.lastMessageID)).forEach(msg => ret.push(msg.id));
	
	res.json({
		status: 'event',
		comment_id: ret,
	});
}));

server.get('/guilds/:guildid/presences', async((req, res) => {
	var guildid = req.params['guildid'];
	var guild = client.guilds.get(guildid);
	var channel = client.channels.get(req.query['channel'] || '');
	
	var ret = {
		online: [], idle: [], dnd: [], offline: []
	};
	for(st of ['online', 'idle', 'dnd', 'offline']) {
		(
			channel ? (
				membersAvailable(channel).filter(m => m.presence.status == st)
			) : (
				guild.members.filter(m => m.presence.status == st)
			)
		).forEach(m => {
			ret[st].push(m.user.username);
		});
	}
	
	res.json(ret);
}));

client.on('message', msg => {
	if(!msgcount[msg.channel.id]) msgcount[msg.channel.id] = 1;
	else msgcount[msg.channel.id]++;
});

server.listen(80, '127.60.9.8', () => print('서버 준비 완료.'));
