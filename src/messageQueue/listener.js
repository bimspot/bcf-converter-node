const amqp = require('amqplib/callback_api')


/**
*  The Listener is responsible for registering the observer to the specified
* message queue and to receive and process the incoming messages.
*/
class Listener {
  /**
  * The `Listener` subscribes to the queue specified during initialisation.
  * When a message is received, it is passes the conversion task to the
  * inejcted `Worker`.
  *
  * @param {String} host The host of the message queue installation.
  * @param {String} queue The queue for the incoming messages.
  * @param {Worker} worker The worker to be used with this listener when task
  * is received.
  */
  constructor(host, queue, worker) {
    this.host = host
    this.queue = queue
    this.worker = worker
  }

  /**
  * The method handles the subscription to the message queue on the
  * specified channel. It also has a _very simple_ retry policy for initial
  * connection errors.
  *
  * When message is received the conversion task is passed to the injected
  * `Worker` instance.
  *
  * @memberof Listener
  */
  subscribe() {
    const self = this
    console.log(`Connecting to queue ${self.queue}`)
    amqp.connect(`amqp://${self.host}`, (error, connection) => {
      if (error) {
        console.warn(error)
        setTimeout(function() {
          self.subscribe()
        }, 1000)
        return
      }

      connection.createChannel((error, channel) => {
        if (error) {
          console.error(error)
          return
        }

        channel.assertQueue(self.queue, {durable: true})
        channel.prefetch(1)

        console.log(' [*] Waiting for messages in %s.', self.queue)

        channel.consume(self.queue, (message) => {
          const json = JSON.parse(message.content.toString())
          self.worker.performWork(json, (error) => {
            const success = (error === undefined)

            if (success === false) {
              console.error(error)
              // Negative acknowledgement of the message. Throwing it away.
              channel.nack(message, false, false)
            } else {
              // Acknowledge the processing of the message to the queue.
              channel.ack(message)
            }
          })
        }, {noAck: false})
      })
    })
  }
};

module.exports = Listener
