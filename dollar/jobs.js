(function(global) {

var panel_types = ['success', 'danger', 'warning', 'info', 'default'];

var TaskDisplay = function() {
}

TaskDisplay.prototype.addProcDelete = function(run_id, username, pid) {
	$('#kill_jobs_alert_empty').hide( 'slow' );
	var html = '';
	html += '<li id="task_'+run_id+'_'+pid+'" class="list-group-item task_deleting" data-pid="'+pid+'" data-run_id="'+run_id+'">';
	html += '	<div>';
	html += '		<p style="display:inline;">'+username+'</p>';
	html += '		<p class="pull-right">killing pid: '+pid+'</p>';
	html += '	</div>';
	html += '</li>';
	var task$ = $(html).hide();
	$('#kill_jobs_alert').append(task$);
	task$.show('slow');
}

TaskDisplay.prototype.removeProcDelete = function(run_id, pid) {
	$('#task_'+run_id+'_'+pid).remove();
	this.process();
}

TaskDisplay.prototype.addJobDelete = function(run_id, username, scenario) {
	$('#kill_jobs_alert_empty').hide( 'slow' );
	var html = '';
	html += '<li id="task_'+run_id+'" class="list-group-item task_deleting" data-run_id="'+run_id+'">';
	html += '	<div>';
	html += '		<p style="display:inline;">'+username+'</p>';
	html += '		<p class="pull-right">killing job: <strong>'+scenario+'</strong></p>';
	html += '	</div>';
	html += '</li>';
	var task$ = $(html).hide();
	$('#kill_jobs_alert').append(task$);
	task$.show('slow');
}

TaskDisplay.prototype.removeJobDelete = function(run_id) {
	$('#task_'+run_id).remove();
	this.process();
}

TaskDisplay.prototype.process = function() {
	if (!$('.task_deleting').length) {
		$('#kill_jobs_alert_empty').show( 'slow' );
	}
}

var Proc = function(username, run_id, pid, port, machine, name, status) {
	this.username = username;
	this.run_id = run_id;
	this.name = name;
	this.pid = pid;
	this.port = port;
	this.machine = machine;
	this.status = status;
	this.deleting = false;
	this.deleting_job = false;
	this.tr_id = 'tr_pid_'+this.run_id+'_'+this.pid;
	this.kill_btn_id = 'kill_pid_'+this.run_id+'_'+this.pid;
	if (this.is_main()) {
		this.value = 1;
	} else {
		this.value = this.pid + 1000;
	}
}

Proc.prototype.update = function(status) {
	this.status = status;
}

Proc.prototype.get_process_row_HTML = function() {
	var r = '';
	r += '<tr id="'+this.tr_id+'">';
	r += '	<td>'+this.name+'</td>';
	r += '	<td>'+this.pid+'</td>';
	r += '	<td>'+this.port+'</td>';
	r += '	<td>'+this.machine+'</td>';
	r += '	<td>'+this.status+'</td>';
	r += '	<td>';
	r += '		<button type="button" id="'+this.kill_btn_id+'" class="btn btn-'+'default'+' btn-xs active" data-pid="'+this.pid+'" data-run_id="'+this.run_id+'" data-username="'+this.username+'">';
	r += '			Kill';
	r += '		</button>';
	r += '	</td>';
	r += '</tr>';
	return r;
}

Proc.prototype.is_main = function() {
	return this.name === 'main';
}

Proc.prototype.display_for_kill = function() {
	var btn$ = $('#'+this.kill_btn_id);
	btn$.removeClass('active').addClass('disabled').text('Stopping');
	btn$.closest('tr').addClass('danger');
}

Proc.prototype.kill = function() {
	this.deleting = true;
	this.display_for_kill();
	task_display.addProcDelete(this.run_id, this.username, this.pid);
}

Proc.prototype.kill_by_job = function() {
	this.display_for_kill();
}

Proc.prototype.remove = function() {
	task_display.removeProcDelete(this.run_id, this.pid);
	$('#'+this.tr_id).remove();
}

var Job = function(username, starttime, run_id, scenario, port, procs) {
	this.procs = {};
	this.procs_sorted = [];
	this.username = username;
	this.starttime = starttime;
	this.run_id = run_id;
	this.scenario = scenario;
	this.port = port;
	this.deleting = false;
	this.kill_btn_id = 'kill_run_id_'+this.run_id;
	this.num_procs_id = 'num_procs_run_id_'+this.run_id;
	this.update(procs);
}

Job.prototype.update = function(procs) {  // username, pid, port, machine, name, status
	var j = this;
	var touched = [];
	_.each(procs, function(p) {
		if (j.procs[p.pid]) {
			j.procs[p.pid].update(p.status);
		} else {
			j.procs[p.pid] = new Proc(j.username, j.run_id, p.pid, j.port, p.machine, p.name, p.status);
			$('#'+j.run_id+' table tbody').append(j.procs[p.pid].get_process_row_HTML());
		}
		touched.push(p.pid);
	});
	var removed = _.difference(_.map(this.procs, function(p){return p.pid;}), touched);
	_.each(removed, function(pid) {j.remove_pid(pid);});
	// console.log('this.procs='+JSON.stringify(this.procs));

	this.procs_sorted = _.sortBy(this.procs, function(p) {return p.value;});
	$('#'+this.num_procs_id).text(_.size(this.procs));
}

Job.prototype.display_for_kill = function() {
	$('#'+this.kill_btn_id).removeClass('active').addClass('disabled').text('Stopping');
}

Job.prototype.kill_pid = function(pid) {
	if (this.procs[pid]) {
		this.procs[pid].kill();
	} else {
		console.log('ERROR: kill_pid non-existant pid for job of run_id: '+this.run_id+' and pid:'+pid);
	}
}

Job.prototype.kill = function() {
	this.deleting = true;
	_.each(this.procs, function(p) { p.kill_by_job(); });
	this.display_for_kill();
	task_display.addJobDelete(this.run_id, this.username, this.scenario);
}

Job.prototype.remove_pid = function(pid) {
	if (this.procs[pid]) {
		this.procs[pid].remove();
		delete this.procs[pid];
	} else {
		console.log('ERROR: remove_pid non-existant pid for job of run_id: '+this.run_id+' and pid:'+pid);
	}
}

Job.prototype.remove = function() {
	if (this.deleting) {
		task_display.removeJobDelete(this.run_id);
	}
	_.each(this.procs, function(p) { p.remove(); });
	$('#full_'+this.run_id).remove();
}

Job.prototype.get_time_delta = function() {
	var d = new Date();
	return 'runtime '+Math.round((d-this.starttime)/1000)+' secs';
}

var update_time_deltas = function() {
	_.each(jobs, function(j) {
		$('#time_delta_'+j.run_id).text(j.get_time_delta());
	});
	// console.log('in timer')
}

Job.prototype.add_accordion_panel_HTML = function() {
	var pan = '';
	pan += '<div class="panel panel-success" id="full_'+this.run_id+'">';
	pan += '	<div class="panel-heading">';
	pan += '		<div class="row">';
	pan += '			<div class="col-md-8">';
	pan += '				<h4 class="panel-title">';
	pan += '					<a class="collapsed" data-toggle="collapse" data-parent="#accordion_'+this.username+'" href="#'+this.run_id+'">';
	pan += '						<span class="glyphicon glyphicon-chevron-right chevron"></span>';
	pan += '						Run '+this.scenario+':';
	pan += '					</a>';
	pan += '					<small id="time_delta_'+this.run_id+'"></small>';
	pan += '				</h4>';
	pan += '			</div>';
	pan += '			<div class="col-md-1">';
	pan += '				<h4 class="panel-title text-center">';
	pan += '					<span id="'+this.num_procs_id+'" class="badge">'+_.size(this.procs)+'</span>';
	pan += '				</h4>';
	pan += '			</div>';
	pan += '			<div class="col-md-1">';
	pan += '			</div>';
	pan += '			<div class="col-md-2">';
	pan += '				<h4 class="panel-title">';
	pan += '					<button id="'+this.kill_btn_id+'" type="button" class="btn btn-success btn-xs active"';
	pan += '						data-username="'+this.username+'" data-scenario="'+this.scenario+'" data-run_id="'+this.run_id+'">Kill</button>';
	pan += '				</h4>';
	pan += '			</div>';
	pan += '		</div>';
	pan += '	</div>';
	pan += '	<div id="'+this.run_id+'" class="panel-collapse collapse">';
	pan += '		<table class="table table-hover table-condensed">';
	pan += '			<thead>';
	pan += '				<tr>';
	pan += '					<th>Name</th>';
	pan += '					<th>pid</th>';
	pan += '					<th>port</th>';
	pan += '					<th>Machine</th>';
	pan += '					<th>Status</th>';
	pan += '					<th>Action</th>';
	pan += '				</tr>';
	pan += '			</thead>';
	pan += '			<tbody>';
	_.each(this.procs, function(p) {
		pan += p.get_process_row_HTML();
	});
	pan += '			</tbody>';
	pan += '		</table>';
	pan += '	</div>';
	// pan += '	<div class="panel-footer">Panel footer</div>';
	pan += '</div>';
	return pan;
}

Job.prototype.add_accordion_panel = function() {
	if (!$('#'+this.run_id).length) {
	    var pan = this.add_accordion_panel_HTML();
    	$('#accordion_'+this.username).append(pan);
    }
}

var tab_first = 'active';
var tab_ffirst = ' active in';
var tab_colors = ['tab_bg_0', 'tab_bg_1', 'tab_bg_2'];

var setup_user_tab_part1_HTML = function(username, num_jobs) {
	var t = '';
	t += '<li class="'+tab_first+' user_tab" id="utab_'+username+'" data-user="'+username+'">';
	t += '	<a href="#'+username+'" role="tab" data-toggle="tab">';
	t += 		username+' <span id="user_job_count_'+username+'" class="badge">'+num_jobs+'</span>';
	t += '	</a>';
	t += '</li>';
	tab_first = '';
	return t;
}

var setup_user_tab_part2_HTML = function(username) {
	var t = '';
	t += '<div class="tab-pane'+tab_ffirst+'" id="'+username+'">';
	t += '	<div class="panel-group" id="accordion_'+username+'"></div>';
	t += '</div>';
	tab_ffirst = '';
	return t;
}

var assign_user_tab_colors = function() {
	var cs = tab_colors.join(' ');
	_.each($('li.user_tab'), function(u, i) {
		$(u).removeClass(cs).addClass(tab_colors[i % tab_colors.length]);
	});
}

var get_user_sorted_list = function(users, user_job_count) {
	var user_sorted_list = [];
	if (_.indexOf(users, user_main) > -1 && user_job_count[user_main]) {
		user_sorted_list.push([user_main, user_job_count[user_main]]);
	}
	_.each(users, function(u) {
		if (u !== user_main && user_job_count[u]) {
			user_sorted_list.push([u, user_job_count[u]]);
		}
	});
	// console.log('users='+JSON.stringify(users));
	// console.log('_.map(users)='+JSON.stringify(_.map(users, function(u){return u;})));
	// console.log('user_job_count='+JSON.stringify(user_job_count));
	// console.log('user_sorted_list='+JSON.stringify(user_sorted_list));
	var curr_users = _.map($('li.user_tab'), function(u) {return $(u).data('user');});
	var remove_users = _.difference(curr_users, users);
	// console.log('curr_users='+JSON.stringify(curr_users));
	// console.log('remove_users='+JSON.stringify(remove_users));
	_.each(remove_users, function(u) { $('#utab_'+u).remove(); $('#'+u).remove();});
	return user_sorted_list;
}

var setup_user_tabs = function(users, user_job_count) {
	user_sorted_list = get_user_sorted_list(users, user_job_count);
	var us$ = $('li.user_tab');
	var u_count = 0;
	_.each(user_sorted_list, function(u) {
		var t1 = setup_user_tab_part1_HTML(u[0], u[1]);
		var t2 = setup_user_tab_part2_HTML(u[0]);
		if (us$[u_count]) {
			if ( $(us$[u_count]).data('user') === u[0]) {
				$(us$[u_count]).find('a span').text(u[1]);
				u_count++;
			} else {
				$(us$[u_count]).before(t1);
				$('#jobs_tab_content').append(t2);
			}
		} else {
			$('#jobs_tab').append(t1);
			$('#jobs_tab_content').append(t2);
		}
	});
	assign_user_tab_colors();
}

var get_user_job_count = function(users, jobs) {
	var user_job_count = {};
	_.each(users, function(u) {
		user_job_count[u] = 0;
	});
	_.each(jobs, function(j) {
		user_job_count[j.username]++;
	});
	return user_job_count;
}

var jobs = {};

var process_raw_jobs = function(raw_jobs) {
	// console.log('raw_jobs='+JSON.stringify(raw_jobs));
	_.each(raw_jobs, function(j) {
		if (jobs[j.run_id]) {
			jobs[j.run_id].update(j.procs);
		} else {
			jobs[j.run_id] = new Job(j.username, j.starttime, j.run_id, j.scenario, j.port, j.procs);
		}
	});
	var job_run_ids = _.map(jobs, function(j){return j.run_id;});
	var raw_ids = _.map(raw_jobs, function(r){return r.run_id;});
	var diff_ids = _.difference(job_run_ids, raw_ids);
	_.each(diff_ids, function(j) {
		jobs[j].remove();
		delete jobs[j];
	});
	var empty_jobs = _.filter(jobs, function(j){return !_.size(j.procs);});
	_.each(empty_jobs, function(e){
		e.remove();
		delete jobs[e.run_id];
	});
}

var update_user_tabs = function() {
	var users_with_jobs = _.uniq(_.map(jobs, function(j) { return j.username; })).sort();
	var user_job_count = get_user_job_count(users_with_jobs, jobs);
	setup_user_tabs(users_with_jobs, user_job_count);
	_.each(jobs, function(j) {j.add_accordion_panel();});
}

var register_kill_btn_callbacks = function() {
	$( 'div#jobs_tab_content' ).on( "click", "h4.panel-title button.active", function() {
		// var btn$ = $(this);
		// btn$.removeClass('active').addClass('disabled').text('Stopping');
		// btn$.closest('.panel').children('.panel-collapse').find('button').each(function(idx, btn) {
		// 	stop_pid_button($(btn));
		// })
		var run_id = $(this).data('run_id');
		jobs[run_id].kill();
		console.log('ajax call to kill job: '+run_id);
	});

	$( 'div#jobs_tab_content' ).on( 'click', 'tbody > tr > td button.active', function() {
		var run_id = $(this).data('run_id');
		var pid = $(this).data('pid');
		jobs[run_id].kill_pid(pid);
		console.log('ajax call to kill proc: '+pid+' from job: '+run_id);
	});
}

var display_empty = function() {
	tab_first = 'active';
	tab_ffirst = ' active in';
	$('#jobs_tab').empty();
	$('#jobs_tab_content').empty();
	$('#kill_jobs_alert_empty').show().siblings().remove();
	$('#display_jobs').hide();
	$('#display_clear').show();
}

var curr_view_user = false;
var curr_view_job = false;

var get_curr_views = function() {
	curr_view_user = $('li.active').data('user');
	curr_view_job = $('h4 a').not('.collapsed').attr('href');
}

var select_curr_views = function() {
	if ($('li#utab_'+curr_view_user+' a').length) {
		$('li#utab_'+curr_view_user+' a').trigger('click');
		var href = $('a[href='+curr_view_job+']').removeClass('collapsed').attr('href');
		$(href).addClass('in');
	} else {
		$('#jobs_tab li:first a').trigger('click');
		// var u = $('#jobs_tab li:first a').data('user');
		// $('#'+u).addClass('in');
	}
}

var set_display_if_jobs = function() {
	if (_.size(jobs)) {
		$('#display_jobs').show();
		$('#display_clear').hide();
	} else {
		$('#display_jobs').hide();
		$('#display_clear').show();
	}
}

var process_jobs = function(raw_jobs) {
	// console.log('raw_jobs1='+JSON.stringify(raw_jobs));
	get_curr_views();
	process_raw_jobs(raw_jobs);
	update_user_tabs();
	update_time_deltas();
	select_curr_views();
	set_display_if_jobs();
}

var set_user_main = function(username) {
	user_main = username;
}

display_empty();
register_kill_btn_callbacks();
var task_display = new TaskDisplay();

var intervalID = window.setInterval(update_time_deltas, 1000);

global.set_user_main = set_user_main;
global.process_jobs = process_jobs;

})(window);


