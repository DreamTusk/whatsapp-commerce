import mailer from "nodemailer";

const from_email = process.env.GMAIL_USER;
const app_password = process.env.GMAIL_APP_PASSWORD;

const sendSimpleEmail= async(to_email:string, subject:string, content:string)=>{


    
    const transport = mailer.createTransport({
        service:"gmail",
        auth: {
            user: from_email,
            pass: app_password,
        },
    })

    await transport.sendMail({
        from:from_email,
        to:to_email,
        subject:subject,
        text:content
    })
}

const sendEmail = {

    sendSimpleEmail
};

export default sendEmail;