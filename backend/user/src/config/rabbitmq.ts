import amql from 'amqplib';

let channel: amql.Channel;

export const connectRabbitMQ = async()=>{
    try {
        let connection = await amql.connect({
            protocol: "amqp",
            hostname: process.env.Rabbit_Host,
            port: 5672,
            username: process.env.Rabbit_User,
            password: process.env.Rabbit_Pass
        });
        channel = await connection.createChannel();
        console.log("✅RabbitMq connected");
        
    } catch (error) {
        console.log("Failed to connect RabbitMq", error);
    }
};

export const publishToQueue = async(queueName: string, message: any) =>{
    if(!channel){
        console.log("RabbitMq channel is not initialize");
        return;
    }

    channel.assertQueue(queueName, {durable: true});

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)),{
        persistent: true,
    });
}
