const shell = require('shelljs')
const Sender = require('../messageQueue/sender')
const rabbitmqHost = process.env.RABBIT_MQ_HOST
const rabbitmqChannel = process.env.RABBIT_MQ_CHANNEL
const rabbitmqStatusTopic = process.env.RABBIT_MQ_STATUS_TOPIC

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
  performWork(message, completion) {
    const bcfPath = 'sample.bcfzip'
    const jsonPath = 'sample.json'

    // Executing the converter
    shell
      .exec(`sh convert.sh ${bcfPath} ${jsonPath}`,
        (code, stdout, stderr) => {
          console.log('Exit code:', code)
          console.log('Program output:', stdout)
          // console.log('Conversion complete:', message.uuid)

          const error = (stderr.length > 0) ? stderr : undefined

          if (error !== undefined) {
            completion(error)
            return
          }
          const sender = new Sender(
            rabbitmqHost,
            rabbitmqChannel,
            message.context)

          message.artifacts = [
            {
              type: 'bcfjson',
              path: `${jsonPath}`,
              storage: 'file',
            },
          ]

          sender.sendTo(rabbitmqStatusTopic, message)

          completion()
        })
  }
}

module.exports = Converter
