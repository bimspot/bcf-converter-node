const amqp = require('amqplib/callback_api')

/**
* The Broadcaster is responsible for sending tasks back to the specified
*  queue upon compling a work item.
*/
class Broadcaster {
  /**
   * Creates an instance of Broadcaster.
   *
   * @param {String} host The host of the message queue installation.
   * @param {String} channel The name of the broadcast channel
   * @param {String} service The name of the service sending the broadcast
   * messages.
   * @param {Object} context The context of this task.
   * @param {String} context.projectId The id of the project.
   * @param {String} context.role The role within the project.
   * @param {String} context.ifcProjectId The identifier of the IfcProject
   * @memberof Broadcaster
   */
  constructor(host, channel, service, context) {
    this.host = host
    this.channel = channel
    this.serviceName = service
    this.context = context
  }

  /**
  * The `send` method takes the different components of the broadcast
  * message to be sent, converts them into a single JSON object and sends
  * it off to the "status" queue as a simple broadcast.
  *
  * @param {String} message The message to be broadcast. Context will be added
  * automatically.
  */
  send(message) {
    const self = this
    message.service = this.serviceName
    message.context = this.context

    // Stringify message
    const json = JSON.stringify(message)

    // Broadcast to status
    amqp.connect(`amqp://${self.host}`, (error, connection) => {
      connection.createChannel(function(error, channel) {
        channel.assertExchange(
          self.channel, 'fanout', {durable: false})
        channel.publish(self.channel, '', new Buffer(json))
        console.log(`Broadcast message ${json}`)
      })

      setTimeout(function() {
        connection.close()
      }, 500)
    })
  }
};

module.exports = Broadcaster
