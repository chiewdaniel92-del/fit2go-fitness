-- Update Primary Goal options to match PRD
UPDATE assessment_options_primary_goal SET label = 'Recover from pain or injury / post-operative', description = 'Get back to full function after injury or surgery' WHERE sort_order = 1;
UPDATE assessment_options_primary_goal SET label = 'Improve movement quality and resilience', description = 'Move better and build a body that handles stress' WHERE sort_order = 2;
UPDATE assessment_options_primary_goal SET label = 'Increase strength, speed, or performance', description = 'Take your athletic performance to the next level' WHERE sort_order = 3;
UPDATE assessment_options_primary_goal SET label = 'Optimise health, energy, and longevity', description = 'Build sustainable health for the long term' WHERE sort_order = 4;
UPDATE assessment_options_primary_goal SET label = 'Maintain high performance with less breakdown', description = 'Stay at your peak without constant setbacks' WHERE sort_order = 5;

-- Update Current State options to match PRD
UPDATE assessment_options_current_state SET label = 'Pain-free and performing well', description = 'Everything is working smoothly' WHERE sort_order = 1;
UPDATE assessment_options_current_state SET label = 'Minor issues that come and go', description = 'Small niggles that don''t stop you' WHERE sort_order = 2;
UPDATE assessment_options_current_state SET label = 'Persistent discomfort or tightness', description = 'Ongoing issues that affect your training' WHERE sort_order = 3;
UPDATE assessment_options_current_state SET label = 'Pain that limits training or daily life', description = 'Significant pain impacting your activities' WHERE sort_order = 4;
UPDATE assessment_options_current_state SET label = 'Currently injured or rehabbing', description = 'Dealing with an active injury' WHERE sort_order = 5;