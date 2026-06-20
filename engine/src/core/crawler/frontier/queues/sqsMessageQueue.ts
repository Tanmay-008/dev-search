import { messageQueue, messageQueueResponse } from "./messageQueue";
import { DeleteMessageCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs"; 
import { sqsClient } from "./SQSCliint";
export class SqsMessageQueue implements messageQueue{
    
    private client: SQSClient; 
    private url: string;

    constructor (client:SQSClient,url:string){
       this.client=client,
       this.url=url
    }
    
    async enqueue(data: string): Promise<boolean> {
        const command= new SendMessageCommand(
            {
                QueueUrl:this.url,
                MessageBody:data

            }
        )
        try {
          const responce=await this.client.send(command)
          return true;
        } catch (error) {
           return false
        }
       
    }

    
    async dequeue() {
        const command=new ReceiveMessageCommand(
            {
                QueueUrl:this.url,
                MaxNumberOfMessages:4,
                WaitTimeSeconds: 20,
                VisibilityTimeout:30
            })

        try {
            const responce=await this.client.send(command)
            return responce

        } catch (error) {
            
        }
    }

    async acknowledge(){
      const command=new DeleteMessageCommand({
        QueueUrl: "STRING_VALUE", // required
        ReceiptHandle: "STRING_VALUE", // required
      })

      const response=await sqsClient.send(command)
    }

    

}