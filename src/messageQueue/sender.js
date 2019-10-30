const amqp = require('amqplib/callback_api')

/**
 * The Sender is responsible for sending tasks back to the specified
 * queue upon compling a work item.
 */
class Sender {
  /**
   * Instantiates and returns a instance of the Sender class.
   * The queue for the outgoing messages is specified upon creation.
   *
   * @param {String} uri The uri of the message queue installation.
   * @param {String} queue The queue for the outgoing messages.
   * @param {Context} context The context of this task.
   * @param {String} context.projectId The id of the project.
   * @param {String} context.role The role within the project.
   * @param {String} context.ifcProjectId The identifier of the IfcProject
   */
  constructor(uri, queue, context) {
    this.uri = uri
    this.queue = queue
    this.context = context
  }

  /**
   * Sends the specified message to the predefined queue.
   *
   * @param {Message} message The message to be sent to the queue. Context
   * will be added automatically.
   * @param {String} message.uuid The unique id of the running task.
   * @param {String} message.path The path where the resources can be
   * found/output for this task.
   * @param {Context} message.context Means the project/role/ifcProject context
   * of the message.
   * @param {String} message.context.projectId The id of the project.
   * @param {String} message.context.role The role within the project.
   * @param {String} message.context.ifcProjectId The identifier of the
   * IfcProject
   */
  send(message) {
    const self = this
    message.context = this.context
    const json = JSON.stringify(message)

    // Sending message to RabbitMQ
    amqp.connect(self.uri, (error, connection) => {
      if (error) {
        console.warn(error)
        return
      }

      connection.createChannel((error, channel) => {
        if (error) {
          console.warn(error)
          return
        }
        const q = self.queue
        channel.assertQueue(q, {durable: true})
        channel.sendToQueue(q, Buffer.from(json), {persistent: true})
        console.log(`Sent message '${json}' to queue '${q}'`)
      })
      setTimeout(function() {
        connection.close()
      }, 500)
    })
  }

  /**
  * Sends the specified message to the specified topic.
  *
  * @param {String} topic The name of the topic the message is sent to.
  * @param {JSON} message The message to be sent.
  * @memberof Sender
  */
  sendTo(topic, routingKey, message) {
    const self = this
    message.context = this.context
    const json = JSON.stringify(message)

    // Sending message to RabbitMQ
    amqp.connect(self.uri, (error, connection) => {
      if (error) {
        console.warn(error)
        return
      }

      connection.createChannel((error, channel) => {
        if (error) {
          console.warn(error)
          return
        }
        const q = self.queue
        channel.assertExchange(topic, 'topic', {durable: true})
        channel.publish(topic, routingKey, Buffer.from(json))
        console.log(`Sent message '${json}' to topic '${topic}', key '${routingKey}'`)
      })
      setTimeout(function() {
        connection.close()
      }, 500)
    })
  }
};

module.exports = Sender
