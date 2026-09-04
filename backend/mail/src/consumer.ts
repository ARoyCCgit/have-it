import ampq from 'amqplib';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

export const startSendOtpConsumer = async()=>{
    try {
        const connection = await ampq.connect({
            protocol: "amqp",
            hostname: process.env.Rabbit_Host,
            port: 5672,
            username: process.env.Rabbit_User,
            password: process.env.Rabbit_Pass
        });

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
        
    } catch (error) {
        console.log('Failed to start RabbitMq consumer',error);
        
    }
}