cmake_minimum_required(VERSION 2.8)
project(particleSim)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ".")

find_package(GLUT REQUIRED)

add_subdirectory(lib/glfw-3.1.1)
include_directories(lib/glfw-3.1.1/include)
include_directories(lib/glew-1.13.0/include)
include_directories(${GLUT_INCLUDE_DIRS})

set(GLEW_SRC lib/glew-1.13.0/src/glew.c)

add_executable(particleSim 
        src/main.cpp
        ${GLEW_SRC})

target_link_libraries(particleSim glfw ${OPENGL_gl_LIBRARY} ${GLUT_LIBRARY} ${OPENGL_glu_LIBRARY} ${GLEW_LIBRARIES} ${GLFW_LIBRARIES})
