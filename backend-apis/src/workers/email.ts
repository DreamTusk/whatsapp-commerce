// Zepto Mail will be integrated later. OTPs and notifications are logged to console for now.

const sendSimpleEmail = async (to_email: string, subject: string, content: string): Promise<void> => {
  console.log(`\n📧 EMAIL TO: ${to_email}`);
  console.log(`   SUBJECT: ${subject}`);
  console.log(`   BODY:\n${content}\n`);
};

const sendEmail = { sendSimpleEmail };

export default sendEmail;
