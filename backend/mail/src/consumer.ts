import ampq from 'amqplib';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

export const startSendOtpConsumer = async()=>{
    try {
        const rabbitmqConfig = process.env.RABBITMQ_URL || {
            protocol: "amqp",
            hostname: process.env.Rabbit_Host || "localhost",
            port: 5672,
            username: process.env.Rabbit_User || "guest",
            password: process.env.Rabbit_Pass || "guest"
        };
        const connection = await ampq.connect(rabbitmqConfig);

        const channel = await connection.createChannel();

        const queueName = "send-otp";

        await channel.assertQueue(queueName, {durable: true});

        console.log("✅ Mail service consumer started, listinng for otp ");

        channel.consume(queueName, async(msg)=>{
            if(msg){
                try {
                    const {to, subject, body} = JSON.parse(msg.content.toString());

                    const transporter  = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port:465,
                        auth:{
                            user: process.env.Nodemailer_User,
                            pass: process.env.Nodemailer_Pass
                        },
                    });
                    
                    await transporter.sendMail({
                        from: `"Have-it" <${process.env.Nodemailer_User}>`,
                        to,
                        subject: subject,
                        text: body
                    });

                    console.log(`Otp send mail ${to}`);
                    channel.ack(msg);
                } catch (error) {
                    console.log('Failed to send otp', error);                    
                }
            }
        })
        
        connection.on("error", (err) => {
            console.error("RabbitMQ connection error in mail service:", err);
            setTimeout(startSendOtpConsumer, 5000);
        });

        connection.on("close", () => {
            console.warn("RabbitMQ connection closed in mail service. Reconnecting in 5s...");
            setTimeout(startSendOtpConsumer, 5000);
        });
        
    } catch (error) {
        console.error('Failed to start RabbitMq consumer, retrying in 5 seconds...', error);
        setTimeout(startSendOtpConsumer, 5000);
    }
}