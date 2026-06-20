
export interface messageQueueResponse {
  
    id: string;
    payload: string;
    receiptHandle: string;
}

export interface messageQueue  {
    enqueue(data:string):Promise<boolean>,
    dequeue():Promise<any>,
    acknowledge():void,



}

