var html = {
    escape(content) {
        content = content.replace(/[&]/gi, '&amp;');
        content = content.replace(/["]/gi, '&quot;');
        content = content.replace(/[<]/gi, '&lt;');
        content = content.replace(/[>]/gi, '&gt;');
        
        return content;
    }
};

var guild = document.querySelector('meta[name="guild"]').getAttribute('content');
var channel = document.querySelector('meta[name="channel"]').getAttribute('content');

function formatDatetime() {
    $('time[datetime]').each(function() {
        var time = $(this);
        var date = new Date(time.attr('datetime'));
        if(!date) return;

        var now = new Date();
        var fmt = time.attr('data-format');
        var floorof = Math.floor

        if(fmt && fmt !== 'b') {
            var ret = fmt;
            ret = ret.replace(/Y/i, date.getFullYear());
            ret = ret.replace(/m/i, (date.getMonth() + 1 >= 10 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1)));
            ret = ret.replace(/d/i, (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate()));

            ret = ret.replace(/H/i, (date.getHours() >= 10 ? date.getHours() : '0' + date.getHours()));
            ret = ret.replace(/i/i, (date.getMinutes() >= 10 ? date.getMinutes() : '0' + date.getMinutes()));
            ret = ret.replace(/s/i, (date.getSeconds() >= 10 ? date.getSeconds() : '0' + date.getSeconds()));

            ret = ret.replace(/O/i, new Date().toString().match(/([-\+]\d+)/)[1]);
            ret = ret.replace(/N/i, date.getHours() >= 12 ? '오후' : '오전');

            time.text(ret);
        } else {
            var ret = '';
            var gap = (now.getTime() - date.getTime()) / 1000;

            if(gap / 31104000 >= 1) {
                ret = floorof(gap / 31104000) + '년 전';
            } else if(gap / 2592000 >= 1) {
                ret = floorof(gap / 2592000) + '달 전';
            } else if(gap / 604800 >= 1) {
                ret = floorof(gap / 604800) + '주 전';
            } else if(gap / 86400 >= 1) {
                var days = floorof(gap / 86400);
                var dstr = '';

                switch (days) {
                case 1:
                    dstr = '하루';
                    break;
                case 2:
                    dstr = '이틀';
                    break;
                case 3:
                    dstr = '사흘';
                    break;
                case 4:
                    dstr = '나흘';
                    break;
                case 5:
                    dstr = '닷새';
                    break;
                case 6:
                    dstr = '엿새';
                    break;
                case 7:
                    dstr = '이레';
                    break;
                default:
                    dstr = days + '일';
                }

                ret = dstr + ' 전';
            } else if(gap / 3600 >= 1) {
                ret = floorof(gap / 3600) + '시간 전';
            } else if(gap / 60 >= 1) {
                ret = floorof(gap / 60) + '분 전';
            } else if(gap / 1 >= 1) {
                ret = floorof(gap / 1) + '초 전';
            } else {
                ret = '방금 전';
            }

            time.text(ret);
            time.attr('title',
                date.getFullYear() + '년 ' +
                (date.getMonth() + 1) + '월 ' +
                date.getDate() + '일 ' +
                (date.getHours() >= 12 ? '오후' : '오전') + ' ' +
                (date.getHours() > 12 ? date.getHours() - 12 : (date.getHours() == 0 ? 12 : date.getHours())) + '시 ' +
                date.getMinutes() + '분'
            );
        }
    });
}

$(function() {
	setInterval(function() {
		$.ajax({
			url: '/guilds/' + guild + '/presences?channel=' + channel,
			dataType: 'json',
			success: function(d) {
				for(st of ['online', 'idle', 'dnd', 'offline']) {
					$('select#' + st).html('');
					for(item of d[st]) {
						$('select#' + st)[0].innerHTML += '<option>' + html.escape(item) + '</option>';
					}
				}
			}
		});
	}, 500);
	
	var typing = 0;
	
	$('input[name="text"]').on('input', function() {
		if(!typing) {
			typing = 1;
			setTimeout(function() {
				typing = 0;
			}, 3000);
			
			$.ajax({
				url: '/channels/' + guild + '/' + channel + '/typing',
				type: 'POST',
			});
		}
	});
	
	/* https://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up */
	setInterval(scrl, 1000);

	var scrolled = 0;
	function scrl(force) {
		if(!scrolled || force) {
			var el = $('#res-container')[0];
			el.scrollTop = el.scrollHeight;
		}
	}

	$("#res-container").on('scroll', function() {
		scrolled = 1;
	});
	
	scrl(1);
	
	formatDatetime();
	
	(function() {
		var rnum = Number($('div.res-wrapper:last-child a.num').text().replace('#', '')) + 1 - 1;
		
		function isVisible(elmt) {
			/* https://stackoverflow.com/questions/487073/how-to-check-if-element-is-visible-after-scrolling/8375180 */
			var docViewTop = $('div#res-container').scrollTop();
			var docViewBottom = docViewTop + $('div#res-container').height();
			var elemTop = $(elmt).offset().top;

			var elemBottom = elemTop + $(elmt).height();

			return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
			
			var top = elmt.offsetTop;
			var left = elmt.offsetLeft;
			var width = elmt.offsetWidth;
			var height = elmt.offsetHeight;

			while(elmt.offsetParent) {
				elmt = elmt.offsetParent;
				top += elmt.offsetTop;
				left += elmt.offsetLeft;
			}

			return (
				top < (pageYOffset + innerHeight) &&
				left < (pageXOffset + innerWidth) &&
				(top + height) > pageYOffset &&
				(left + width) > pageXOffset
			);
		}
		
		var allLoadingRes = 'div#res-container div.res-wrapper.res-loading';
		var loadingRes = allLoadingRes + '[data-visible="true"]';
		var loadingRes2 = loadingRes + '[data-locked="false"]';

		window.setVisibleState = function() {
			$(allLoadingRes).each(function() {
				var item = $(this);
				if(isVisible(item[0])) {
					item.attr('data-visible', 'true');
				} else {
					item.attr('data-visible', 'false');
				}
			});
		};
		
		document.addEventListener('scroll', setVisibleState);

		window.setShowBtnEvent = function() {
			$('a.show-hidden-content').click(function() {
				$(this).parent().parent().children('.hidden-content').show();
				$(this).parent().css('margin', '10px 0px 0px 0px');
				$(this).remove();
			});
		};

		function fetchComments() {
			setVisibleState();

			if($(loadingRes2).length) {
				var loadingID = $(loadingRes2)[0].getAttribute('data-id');
				$(loadingRes2).attr('data-locked', 'true');

				$.ajax({
					type: "GET",
					url: '/channels/' + guild + '/' + channel + '/' + loadingID + '?num=' + $('div.res-wrapper:first-child').find('a.num').text().replace('#', ''),
					dataType: 'html',
					success: function(d) {
						var data = $(d);

						data.filter('div.res-wrapper:not([data-id^="older-"])').each(function() {
							var itm = $(this);
							var res = $('div.res-wrapper.res-loading[data-id="' + itm.attr('data-id') + '"]');
							if(!(itm.attr('oldres') == '')) itm.find('a.num').text(res.find('a.num').text());
							
							res.after(itm).remove();
						});
						
						var oldres = '';
						data.filter('div.res-wrapper[oldres]').each(function() {
							var itm = $(this);
							oldres += itm[0].outerHTML;
						});
						
						$('div.res-wrapper.res-loading[data-id^="older-"]')[0].outerHTML = oldres;  // .data('id', data.find('meta[name="lastid"]').attr('content'));

						formatDatetime();
						setShowBtnEvent();
						
						// scrl(1);
					},
					error: function(e) {
						// history.go(0);
					}
				});
			}
		}

		function discussPollStart(topic) {
			$('form#new-thread-form').submit(function() {
				var frm = $(this);
				var submitBtn = $('form#new-thread-form').find('button[type="submit"]');
				submitBtn.attr('disabled', '');
				
				if(!($('input[name="text"]').val())) {
					submitBtn.removeAttr('disabled');
					alert('메시지의 내용이 없습니다.');
					return false;
				}
				
				$.ajax({
					type: "POST",
					dataType: 'json',
					data: {
						'text': $('input[name="text"]').val()
					},
					success: function(d) {
						submitBtn.removeAttr('disabled');
						$('input[name="text"]').val('');
					},
					error: function(d) {
						submitBtn.removeAttr('disabled');
						alert('오류');
					}
				});

				return false;
			});

			var refresher = setInterval(function() {
				var lastid = $('div.res-wrapper:last-child').data('id');
				
				$.ajax({
					type: "POST",
					url: '/notify/channels/' + guild + '/' + channel + '?lastid=' + lastid,
					dataType: 'json',
					success: function(data) {
						var rescount = $('#res-container div.res-wrapper').length;

						for(id of data.comment_id) {
							$('div.res-wrapper[data-id="' + lastid + '"]').after($(
								'<div class="res-wrapper res-loading" data-id="' + id + '" data-locked=false data-visible=false>' +
								'<div class="res res-type-normal">' +
								'<div class="r-head">' +
								'<span class="num"><a id="' + id + '" class="num">#' + ++rnum + '</a>&nbsp;</span>' +
								'</div>' +
								'' +
								'<div class="r-body"></div>' +
								'</div>' +
								'</div>'
							));
							
							lastid = id;
							
							scrl(1);
						}

						setVisibleState();
					}
				});

				fetchComments();
			}, 3000);

			setVisibleState();
		}
		
		setInterval(function() {
			setVisibleState();
		}, 100);
		
		window.discussPollStart = discussPollStart;
		
		discussPollStart();
	})();
});
