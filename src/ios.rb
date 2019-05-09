# TODO: Figure out how to define project dependencies

require 'xcodeproj'

def clone_build_config(project, dest, from_build_config, build_config_name)
  # Heavily inspired by Xcodeproj::Project.add_build_configuration
  existing_build_config = dest.build_configuration_list[build_config_name]

  if existing_build_config
    existing_build_config
  else
    new_config = project.new(Xcodeproj::Project::XCBuildConfiguration)
    new_config.build_settings = Xcodeproj::Project::ProjectHelper.deep_dup(from_build_config.build_settings)
    new_config.name = build_config_name

    dest.build_configuration_list.build_configurations << new_config
    new_config
  end
end

def deep_clone_build_config(project, variant, build_type, team_id)

  #
  # Clone a build configuration both at the project level and at target level.
  # Mimics what Xcode does when going to Project > Info > Configurations > + sign > Duplicate "X" Configuration
  #

  build_config_name = "#{variant} #{build_type}"
  from = project.build_configuration_list[build_type]

  clone_build_config(project, project, from, build_config_name)

  project.targets.each do |target|
    original_target_build_config = target.build_configuration_list[build_type]
    original_target_build_config.build_settings['DEVELOPMENT_TEAM'] = team_id

    unless target.name.end_with?("Tests")
      original_target_build_config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = "match Development $(PRODUCT_BUNDLE_IDENTIFIER)"
    end

    clone_build_config(project, target, original_target_build_config, build_config_name)
  end
end


def make_new_build_configurations(project, team_id)
  deep_clone_build_config(project, 'Dev', 'Debug', team_id)
  deep_clone_build_config(project, 'Dev', 'Release', team_id)
  deep_clone_build_config(project, 'Staging', 'Debug', team_id)
  deep_clone_build_config(project, 'Staging', 'Release', team_id)
end

def add_bundle_id_suffixes(project)
  # 1. extract current bundle id (from "Release"?)
  main_target = project.targets[0]

  # TODO: what if it fails?
  release_build_config = main_target.build_configurations.select  {|config| config.name == 'Release'}.first
  original_bundle_id = release_build_config.build_settings['PRODUCT_BUNDLE_IDENTIFIER']

  # 2. Create release phase-specific suffixes
  main_target.build_configurations.each do |config|
    config.build_settings['CUSTOM_PRODUCT_NAME'] = '$(PRODUCT_NAME)'

    if config.name == 'Staging Debug' or config.name == 'Staging Release'
      config.build_settings['BUNDLE_ID_SUFFIX'] = '.staging'
      config.build_settings['CUSTOM_PRODUCT_NAME'] = '$(PRODUCT_NAME) Staging'
    end

    if config.name == 'Dev Debug' or config.name == 'Dev Release'
      config.build_settings['BUNDLE_ID_SUFFIX'] = '.dev'
      config.build_settings['CUSTOM_PRODUCT_NAME'] = '$(PRODUCT_NAME) Dev'
    end
  end

  # 3. Combine these two
  main_target.build_configurations.each do |config|
    puts "adding bundle suffix to " + config.name
    if !original_bundle_id.include? "$(BUNDLE_ID_SUFFIX)"
      config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = original_bundle_id + "$(BUNDLE_ID_SUFFIX)"
    end
  end
end

def add_schemes(project_path)
  # TODO present a drop down list where the user can choose the base scheme. Also check that the scheme is shared.
  basename = File.basename(project_path, ".xcodeproj")
  main_scheme_name = Xcodeproj::Project.schemes(project_path).select {|name| name == basename}.first
  full_scheme_path = "#{project_path}/xcshareddata/xcschemes/#{main_scheme_name}.xcscheme"
  main_scheme = Xcodeproj::XCScheme.new(full_scheme_path)

  main_scheme.launch_action.build_configuration = "Dev Debug"
  main_scheme.test_action.build_configuration = "Dev Debug"
  main_scheme.analyze_action.build_configuration = "Dev Debug"
  main_scheme.archive_action.build_configuration = "Dev Release"
  main_scheme.profile_action.build_configuration = "Dev Release"

  main_scheme.save_as(project_path, basename + "Dev", shared=true)

  main_scheme.launch_action.build_configuration = "Staging Debug"
  main_scheme.test_action.build_configuration = "Staging Debug"
  main_scheme.analyze_action.build_configuration = "Staging Debug"
  main_scheme.archive_action.build_configuration = "Staging Release"
  main_scheme.profile_action.build_configuration = "Staging Release"

  main_scheme.save_as(project_path, basename + "Staging", shared=true)
end

def get_team_id(team_type, account, password)
  require 'spaceship'
  if (team_type == 'itc')
    Spaceship::Tunes.login(account, password)
    team_id = Spaceship::Tunes.select_team  
    team_id
  elsif (team_type == 'dev')
    Spaceship::Portal.login(account, password)
    team_id = Spaceship::Portal.select_team      
    team_id
  end
end

def get_project_path()
  Dir["ios/*.xcodeproj"].select {|f| File.directory? f}.first
end

COMMAND = ARGV[0]
project_path = get_project_path()
project = Xcodeproj::Project.open(project_path)

if COMMAND == "add_schemes"
  add_schemes(project_path)
elsif COMMAND == "make_new_build_configurations"
  team_id = ARGV[1]
  make_new_build_configurations(project, team_id)
  project.save
elsif COMMAND == "add_bundle_id_suffixes"
  add_bundle_id_suffixes(project)
  project.save
elsif COMMAND == "get_project_path"
  get_project_path
elsif COMMAND == "get_team_id"
  team_type = ARGV[1]
  account = ARGV[2]
  password = ARGV[3]
  team_id = get_team_id(team_type, account, password)
  puts team_id
end


