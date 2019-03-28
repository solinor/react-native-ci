# TODO: Figure out how to define project dependencies

require 'xcodeproj'

def make_new_build_configurations(project)
  project.add_build_configuration('Staging Debug', :debug)
  project.add_build_configuration('Staging Release', :release)
  project.add_build_configuration('Dev Debug', :debug)
  project.add_build_configuration('Dev Release', :release)
end

# TODO: Extract out into init section/function
project_path = '/Users/lewtds/dev/solinor/react-native-ci/circletest/ios/CircleTest.xcodeproj'
project = Xcodeproj::Project.open(project_path)

make_new_build_configurations(project)

project.save
