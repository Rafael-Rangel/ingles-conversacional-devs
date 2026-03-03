-- Seed: CEFR trail A1–B1 with quality content for developers
-- Run after 001_schema.sql. Uses fixed UUIDs so you can re-run by deleting and re-inserting.

-- Levels
insert into public.levels (id, code, name, "order") values
  ('a1000000-0000-4000-8000-000000000001', 'A1', 'Beginner', 1),
  ('a1000000-0000-4000-8000-000000000002', 'A2', 'Elementary', 2),
  ('a1000000-0000-4000-8000-000000000003', 'B1', 'Intermediate', 3)
on conflict (code) do update set name = excluded.name, "order" = excluded."order";

-- A1 Modules
insert into public.modules (id, level_id, title, "order") values
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Basics', 1),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Basic tech words', 2),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Talking about work', 3)
on conflict do nothing;

-- A1 Lessons
insert into public.lessons (id, module_id, title, context, learning_goals, grammar_focus, vocabulary_tags, "order") values
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Hello and introductions', 'You are meeting a colleague for the first time at the office.', '["Introduce yourself", "Say hello and ask names", "Use simple greetings"]', 'verb to be (I am, you are)', '["hello", "name", "nice to meet you"]', 1),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'Talking about your job', 'A new team member asks what you do.', '["Say what your job is", "Use simple present for jobs", "Answer short questions about work"]', 'present simple (I work, I build)', '["developer", "work", "company", "team"]', 2),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'Verb to be', 'You are in a standup. Someone asks if you are the frontend developer.', '["Use I am / you are / we are", "Answer yes/no questions about roles", "Say what your role is"]', 'verb to be (am, is, are)', '["frontend", "backend", "role", "developer"]', 3),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000002', 'Computer and simple actions', 'You explain what you do at the computer every day.', '["Name basic tech actions", "Use simple present", "Say what you do with code"]', 'present simple', '["computer", "code", "write", "run", "test"]', 1),
  ('c1000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000002', 'I work with JavaScript', 'A colleague asks what languages you use.', '["Name programming languages", "Say what you use", "Simple present"]', 'present simple', '["JavaScript", "Python", "language", "project"]', 2),
  ('c1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000003', 'I build websites', 'Someone asks what you build at work.', '["Describe what you build", "Use I build / I create", "Simple nouns"]', 'present simple', '["website", "app", "build", "create"]', 1),
  ('c1000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000003', 'My team and my project', 'You describe your team and current project in simple terms.', '["Talk about your team size", "Name your project", "Use my / our"]', 'possessives (my, our)', '["team", "project", "people", "office"]', 2);

-- A2 Modules
insert into public.modules (id, level_id, title, "order") values
  ('b2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'Talking about tasks', 1),
  ('b2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Explaining what you did', 2),
  ('b2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'Asking questions', 3)
on conflict do nothing;

-- A2 Lessons
insert into public.lessons (id, module_id, title, context, learning_goals, grammar_focus, vocabulary_tags, "order") values
  ('c2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'I fix bugs', 'You tell your lead what you usually do.', '["Say what you do at work", "Use I fix / I create / I write", "Present simple for routines"]', 'present simple', '["bug", "fix", "feature", "code"]', 1),
  ('c2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000001', 'I create features', 'A PM asks what you are working on.', '["Describe your current task", "Use I am working on", "Simple tech vocabulary"]', 'present continuous (I am working)', '["feature", "task", "working on", "API"]', 2),
  ('c2000000-0000-4000-8000-000000000003', 'b2000000-0000-4000-8000-000000000002', 'Yesterday I fixed a bug', 'Daily standup: what did you do yesterday?', '["Talk about past work", "Use past simple", "Describe one task"]', 'past simple (fixed, wrote, deployed)', '["yesterday", "fixed", "deployed", "bug", "branch"]', 1),
  ('c2000000-0000-4000-8000-000000000004', 'b2000000-0000-4000-8000-000000000002', 'What I did today', 'Standup: what have you done so far today?', '["Use past simple for today", "Mention 1–2 tasks", "Short sentences"]', 'past simple', '["today", "pushed", "commit", "test"]', 2),
  ('c2000000-0000-4000-8000-000000000005', 'b2000000-0000-4000-8000-000000000003', 'Can you help me?', 'You are stuck and need to ask a colleague.', '["Ask for help politely", "Use Can you...?", "Explain the problem briefly"]', 'can (requests)', '["help", "stuck", "error", "problem"]', 1),
  ('c2000000-0000-4000-8000-000000000006', 'b2000000-0000-4000-8000-000000000003', 'Asking for clarification', 'You did not understand a requirement. You ask the PM.', '["Ask for repetition", "Use Could you...? / What do you mean?", "Clarify one point"]', 'could, what do you mean', '["mean", "clarify", "requirement", "understand"]', 2);

-- B1 Modules
insert into public.modules (id, level_id, title, "order") values
  ('b3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 'Daily meetings', 1),
  ('b3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'Describing problems', 2),
  ('b3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'Explaining code', 3)
on conflict do nothing;

-- B1 Lessons
insert into public.lessons (id, module_id, title, context, learning_goals, grammar_focus, vocabulary_tags, "order") values
  ('c3000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Daily standup', 'You are in a daily meeting with your development team.', '["Say what you worked on yesterday", "Say what you will do today", "Mention blockers"]', 'past simple, future (will / going to)', '["standup", "yesterday", "today", "blocker", "task"]', 1),
  ('c3000000-0000-4000-8000-000000000002', 'b3000000-0000-4000-8000-000000000001', 'Talking about progress', 'In a sync you explain how much of the feature is done.', '["Describe progress", "Use present perfect (I have done)", "Estimate time"]', 'present perfect (have done, have been)', '["progress", "done", "almost", "estimate"]', 2),
  ('c3000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000002', 'Describing a bug', 'You explain to a teammate what bug you found.', '["Describe what is wrong", "Use present simple and past", "Steps to reproduce"]', 'present simple, past simple', '["bug", "reproduce", "steps", "happens", "when"]', 1),
  ('c3000000-0000-4000-8000-000000000004', 'b3000000-0000-4000-8000-000000000002', 'Asking for help with a bug', 'You need help debugging. You explain the situation.', '["Explain what you tried", "Ask for help", "Use I have tried / It still"]', 'present perfect, modals (could, should)', '["debug", "tried", "log", "error"]', 2),
  ('c3000000-0000-4000-8000-000000000005', 'b3000000-0000-4000-8000-000000000003', 'Explaining what you did today', 'End of day: you summarize your work for the team.', '["Summarize tasks", "Use past simple and present perfect", "Mention PRs or deploys"]', 'past simple, present perfect', '["PR", "merge", "deploy", "review"]', 1),
  ('c3000000-0000-4000-8000-000000000006', 'b3000000-0000-4000-8000-000000000003', 'Talking about an API', 'You explain to a colleague what an API does or how you use it.', '["Describe an API in simple terms", "Use it returns / you send", "Vocabulary: endpoint, request, response"]', 'present simple (describing systems)', '["API", "endpoint", "request", "response", "returns"]', 2);
