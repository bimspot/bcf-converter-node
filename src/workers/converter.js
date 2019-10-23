const shell = require('shelljs')
const os = require('os')
const fs = require('fs')
const Sender = require('../messageQueue/sender')
const AWS = require('aws-sdk')
const rabbitmqHost = process.env.RABBIT_MQ_URI
const rabbitmqChannel = process.env.RABBIT_MQ_QUEUE_BCF_CONVERTER
const rabbitmqStatusTopic = process.env.RABBIT_MQ_STATUS_TOPIC
const rabbitmqBcfImportChannel = process.env.RABBIT_MQ_QUEUE_BCF_IMPORT

/**
 * The converter runs the bash script in `convert.sh` which outputs the
 * different formats from the input IFC file.
 *
 * Then it runs a match for inserting the node types into the gltf file.
 *
 * @class Converter
 */
class Converter {
  /**
   * The converter runs the bash script in `convert.sh` which outputs the
   * different formats from the input IFC file.
   *
   * Then it runs a match for inserting the node types into the gltf file.
   *
   * @param {String} message The message received from the message queue.
   * @param {Function} completion The completion closure to execute when the
   * operation finishes. An error is passed if the operation fails.
   * @memberof Converter
   */
  async performWork(message, completion) {
    const self = this
    // Exchange for reporting status
    const sender = new Sender(
      rabbitmqHost,
      rabbitmqChannel,
      message.context)

    let bcfPath
    let jsonPath = `/data/IFC/${message.context.projectId}/` +
      `${message.context.role}/${message.context.ifcProjectId}/BCF/`

    try {
      // s3://bimspot-modelchecker/bcf/bcfzip/{projectId}/{uuid}.bcfzip
      const bcfS3Path = message.task.input.bcfs['1'].path
      const regex = /s3:\/\/(\S[^/]*)\/(.*)$/i
      // eslint-disable-next-line no-unused-vars
      const [array, bucket, key] = bcfS3Path.match(regex)
      bcfPath = await self.downloadBcfzip(bucket, key)

      const filename = bcfPath.split('/').pop().split('.')[0]
      jsonPath += `${filename}.json`
    } catch (e) {
      completion(e)
      message.task.error = {
        error: error,
        message: error.message,
      }
      sender.sendTo(rabbitmqStatusTopic, message)
      return
    }

    // Executing the converter
    shell
      .exec(`sh convert.sh ${bcfPath} ${jsonPath}`,
        (code, stdout, stderr) => {
          console.log('Exit code:', code)
          console.log('Program output:', stdout)
          console.log('Conversion complete:', message.uuid)

          // Removing the temporary file.
          fs.unlinkSync(bcfPath)

          const error = (stderr.length > 0) ? stderr : undefined

          if (error !== undefined) {
            completion(error)
            message.task.error = {
              error: error,
              message: error.message,
            }
            sender.sendTo(rabbitmqStatusTopic, message)
            return
          }

          message.artifacts = [
            {
              type: 'bcfjson',
              path: `${jsonPath}`,
              storage: 'file',
            },
          ]
          sender.sendTo(rabbitmqStatusTopic, message)

          // Forwarding the message to the collab service for importing it.
          // The metadata is used to describe the type, that is bcfjson.
          // We also need to send along the metadata of the original bcfzip.
          const original = message.task.input.bcfs['1'].metadata || {}
          const type = {type: 'bcfjson'}
          const metadata = Object.assign(original, type)

          message.task.input.bcfs['2'] = {
            path: jsonPath,
            metadata: metadata,
          }
          self.invokeBcfImport(message)

          completion()
        })
  }

  /**
   * Downloads a file from the specified S3 bucket and returns the temporary
   * path for it.
   *
   * @param {String} bucket The S3 bucket where the file is stored.
   * @param {String} key The key of the object at s3.
   * @return {String} Returns the path to the downloaded file.
   * @memberof Converter
   */
  async downloadBcfzip(bucket, key) {
    const filePath = `${os.tmpdir()}/${key.split('/').pop()}`
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: bucket,
        Key: key,
      }
      const s3 = new AWS.S3()
      s3.getObject(params, (error, data) => {
        if (error) {
          return reject(error)
        }
        fs.writeFileSync(filePath, data.Body)
        resolve(filePath)
      })
    })
  }

  /**
   *
   *
   * @param {*} message
   * @memberof Converter
   */
  invokeBcfImport(message) {
    const sender = new Sender(
      rabbitmqHost,
      rabbitmqBcfImportChannel,
      message.context)
    sender.send(message)
  }
}

module.exports = Converter
