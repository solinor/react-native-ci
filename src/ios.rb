# TODO: Figure out how to define project dependencies

require 'xcodeproj'

# def clone_build_config(project, from, name)
#   # Heavily inspired by Xcodeproj::Project.add_build_configuration
#   existing_build_config = project.build_configuration_list[name]
#
#   if existing_build_config
#     existing_build_config
#   else
#     # FIXME: The new build configs seem to always have "Hello World" as the product name
#     main_target = project.targets[0]
#
#     new_config = project.new(Xcodeproj::Project::XCBuildConfiguration)
#     new_config.build_settings = Xcodeproj::Project::ProjectHelper.deep_dup(from.build_settings)
#     new_config.build_settings['PRODUCT_NAME'] = main_target.name
#     new_config.name = name
#
#     project.build_configuration_list.build_configurations << new_config
#     new_config
#   end
# end


def make_new_build_configurations(project)
  # debug_config = project.build_configurations.select {|config| config.name == "Debug"}.first
  # release_config = project.build_configurations.select {|config| config.name == "Release"}.first
  #
  # clone_build_config(project, debug_config, 'Staging Debug')
  # clone_build_config(project, release_config, 'Staging Release')
  #
  # clone_build_config(project, debug_config, 'Dev Debug')
  # clone_build_config(project, release_config, 'Dev Release')

  main_target = project.targets[0]
  product_name = main_target.build_configuration_list['Release'].build_settings['PRODUCT_NAME']

  main_target.add_build_configuration('Staging Debug', :debug)
  main_target.add_build_configuration('Staging Release', :release)
  main_target.add_build_configuration('Dev Debug', :debug)
  main_target.add_build_configuration('Dev Release', :release)

  main_target.build_configurations.each do |config|
    config.build_settings['PRODUCT_NAME'] ||= product_name
  end
end

def add_bundle_id_suffixes(project)
  # 1. extract current bundle id (from "Release"?)
  main_target = project.targets[0]

  # TODO: what if it fails?
  release_build_config = main_target.build_configurations.select  {|config| config.name == 'Release'}.first
  original_bundle_id = release_build_config.build_settings['PRODUCT_BUNDLE_IDENTIFIER']

  # 2. Create release phase-specific suffixes
  main_target.build_configurations.each do |config|
    if config.name == 'Staging Debug' or config.name == 'Staging Release'
      config.build_settings['BUNDLE_ID_SUFFIX'] = '.staging'
    end

    if config.name == 'Dev Debug' or config.name == 'Dev Release'
      config.build_settings['BUNDLE_ID_SUFFIX'] = '.dev'
    end
  end

  # 3. Combine these two
  main_target.build_configurations.each do |config|
    puts "adding bundle suffix to " + config.name
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = original_bundle_id + "$(BUNDLE_ID_SUFFIX)"
  end
end

project_path = 'ios/CircleTest.xcodeproj'
project = Xcodeproj::Project.open(project_path)

make_new_build_configurations(project)
add_bundle_id_suffixes(project)

project.save