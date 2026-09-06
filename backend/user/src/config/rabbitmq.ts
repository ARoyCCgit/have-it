import amql from 'amqplib';

let channel: amql.Channel;

export const connectRabbitMQ = async()=>{
    try {
        const rabbitmqConfig = process.env.RABBITMQ_URL || {
            protocol: "amqp",
            hostname: process.env.Rabbit_Host || "localhost",
            port: 5672,
            username: process.env.Rabbit_User || "guest",
            password: process.env.Rabbit_Pass || "guest"
        };
        let connection = await amql.connect(rabbitmqConfig);
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
