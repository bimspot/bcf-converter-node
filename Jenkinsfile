// The name of the service
def service = 'model-converter'

// The name of the current branch
def branch = env.BRANCH_NAME.replaceAll("[^a-zA-Z0-9 ]+", "-")

// The name of the docker image to be built and pushed
def image = "820709727174.dkr.ecr.eu-central-1.amazonaws.com/${service}"

// The name consists of the job's name and the build number.
// It is used to name the docker container and should be unique.
def containerName = "${env.JOB_NAME}-${BUILD_NUMBER}".replaceAll("[^a-zA-Z0-9 ]+", "-")

// The git hash is added as to the docker image name to be able to distinguish
// between separate builds and deploy them individually.
def gitHash = "";

pipeline {
  agent any
  stages {

    // Using the credentials in Jenkins' credentials store, git checkout is
    // performed
    stage('Checkout') {
      steps {
        git branch: "${env.BRANCH_NAME}",
          credentialsId: '2e500ae7-ce03-47ca-901c-e55188de6d78',
          url: "git@gitlab.com:bimspot/${service}.git"
      }
    }

    // Building the docker image and starting up a container with the
    // newly built image.
    // At first, only a partial build of the 'build' stage is done
    // so the tests can ber run
    stage('Build: testing') {
      steps {
        sh "docker build --target builder -t ${image} ."
        sh "docker run --name ${containerName} --detach --tty ${image} /bin/sh"
      }
    }

    // Performing different tests, for instance:
    // - Running JEST for testing
    // - Postman API integration tests
    stage('Test') {
      steps {
        sh "docker exec ${containerName} jest --ci --reporters=default --reporters=jest-junit"

        // sh """
        //   docker exec ${containerName} \
        //   newman run \
        //   {{collection file}} -e {{environment file}}
        // """
      }
    }

    // Security check of the dependencies using snyk.io monitor
    // // Only runs if package.json, or oom.xml was changed
    stage('Security: snyk') {
      when {
        changeset "src/package.json"
      }
      steps {
        sh "docker exec ${containerName} snyk monitor --org=bimspot"
      }
    }

    // Generating documentation and making it available on docs.bimspot.io
    // Only run for development branch
    stage('Documentation') {
      when {
        expression {
          env.BRANCH_NAME == 'develop'
        }
      }
      steps {
        sh "docker exec ${containerName} jsdoc --configure .jsdoc.json"
        // TODO:
        sh "docker cp ${containerName}:docs ."
      }
    }

    // The production image is built here.
    stage('Build: deploy') {
      steps {
        script {
          gitHash = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim().take(7)
        }
        sh "docker build -t ${image}:${branch} -t ${image}:${branch}-${gitHash} ."
      }
    }

    // Publishes the docker image to ERC after tagging
    // it with the name of the current branch.
    stage('Publish') {
      steps {
        script {
          docker.withRegistry("https://820709727174.dkr.ecr.eu-central-1.amazonaws.com", "ecr:eu-central-1:iam_jenkins") {
            sh "docker push ${image}:${branch}"
            sh "docker push ${image}:${branch}-${gitHash}"
          }
        }
      }
    }
  }

  // These steps run after the pipeline completes.
  post {
    always {
      // Collecting unit test results.
      sh "docker cp ${containerName}:artifacts ."
      junit 'artifacts/*.xml'

      // Stopping and removing docker container
      sh "docker stop ${containerName} && docker rm ${containerName}"

      // Cleanup
      sh "rm -rf docs artifacts"
    }
    success {
      notifySlack('SUCCESS')
    }
    failure {
      notifySlack('ERROR')
    }
  }
}

// Posts a Slack notification with  the job status status and
// code changes from git
def notifySlack(String buildStatus) {
  buildStatus = buildStatus

  def colorName = 'RED'
  def colorCode = '#FF0000'
  def subject = "${buildStatus}: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'"
  def changeSet = getChangeSet()
  def message = "${subject} \n ${changeSet}"

  if (buildStatus == 'SUCCESS') {
    color = 'GREEN'
    colorCode = '#00FF00'
  } else {
    color = 'RED'
    colorCode = '#FF0000'
  }

  slackSend(channel: '#bimspot-builds', color: colorCode, message: message)
}

@NonCPS

// Fetching change set from Git
def getChangeSet() {
  return currentBuild.changeSets.collect { cs ->
    cs.collect { entry ->
        "* ${entry.author.fullName}: ${entry.msg}"
    }.join("\n")
  }.join("\n")
}
