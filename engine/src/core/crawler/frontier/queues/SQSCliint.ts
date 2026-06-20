import {DeleteMessageCommand,
  SQSClient,
  ReceiveMessageCommand,
  ChangeMessageVisibilityCommand,
  SendMessageCommand,
  } from "@aws-sdk/client-sqs"



export const  sqsClient = new SQSClient({
  credentials:{
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  endpoint:process.env.SQS_URL,
  region:process.env.AWS_REGION || process.env.SQS_REGION || "eu-north-1",
  apiVersion:"'2012-11-05'"
});

const sendMessage=async()=>{
    const sendMessageCommand=new SendMessageCommand({
        QueueUrl:process.env.SQS_URL,
        MessageBody: JSON.stringify({
        key1: "value1",
        key2: "value2",
        }),
    })

    try {
        const responce=await sqsClient.send(sendMessageCommand)
        console.log(responce)
    } catch (error) {
        throw new Error("hey this code show the code")
    }
}

export default sendMessage;
