-- Platform console schema smoke tests

begin;
select plan(6);

select has_table('public', 'platform_admins', 'platform_admins exists');
select has_table('public', 'platform_admin_bootstrap_emails', 'bootstrap emails table exists');
select has_function('public', 'is_platform_admin', 'is_platform_admin helper exists');
select has_function('public', 'platform_console_stats', 'platform_console_stats rpc exists');
select has_function('public', 'platform_console_users', 'platform_console_users rpc exists');
select has_function('public', 'platform_console_societies', 'platform_console_societies rpc exists');

select * from finish();
rollback;
