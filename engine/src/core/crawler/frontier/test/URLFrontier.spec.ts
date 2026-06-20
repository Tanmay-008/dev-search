import * as dotenv from 'dotenv';
dotenv.config();

import { URLFrontier } from "../URLFrontier";
import { IQueueProvider, FrontierTask } from "../interfaces/queue-provider.interface";
import { seedUrls } from "../seeds";
import { URLDeduplicator } from "../types";

describe("URLFrontier Logic Tests", () => {
  let queueProviderMock: jest.Mocked<IQueueProvider>;
  let urlDeduplicatorMock: jest.Mocked<URLDeduplicator>;
  let urlFrontier: URLFrontier;

  beforeEach(() => {
    // Har test se pehle nayi mock methods banate hain
    queueProviderMock = {
      publishURL: jest.fn(),
      fetchURL: jest.fn(),
      markComplete: jest.fn(),
      markFailed: jest.fn(),
    } as any;

    urlDeduplicatorMock = {
      isDuplicate: jest.fn(),
      markAsSeen: jest.fn(),
      add: jest.fn(),
    } as any;

    // Yahan URLFrontier ka mock dependencies ke sath injection ho raha hai
    urlFrontier = new URLFrontier(
      queueProviderMock,
      urlDeduplicatorMock
    );
  });

  describe("addUrls Method Test", () => {
    it("should canonicalize the URL before checking for duplicate and then publish", async () => {
      const inputUrl = "HTTPS://Example.com/";
      const canonicalUrl = "https://example.com/";

      // Assume karte hain ki URL pehle se nahi hai (not duplicate)
      urlDeduplicatorMock.isDuplicate.mockResolvedValue(false);

      // Method call function
      await urlFrontier.addUrls(inputUrl);

      // Testing logic validation!
      // 1. Check karo ki duplication canonicalUrl pe lag raha hai ya input vala
      expect(urlDeduplicatorMock.isDuplicate).toHaveBeenCalledWith(canonicalUrl);
      // 2. Pata chal gaya naya hai, toh usko seen mark karo
      expect(urlDeduplicatorMock.markAsSeen).toHaveBeenCalledWith(canonicalUrl);
      // 3. Queue ko batao ki naya task daalo
      expect(queueProviderMock.publishURL).toHaveBeenCalledWith(canonicalUrl);
    });

    it("should return early and NOT publish if URL already exists", async () => {
      const inputUrl = "https://example.com/";

      // Iss baar duplicate TRUE aa raha hai!!
      urlDeduplicatorMock.isDuplicate.mockResolvedValue(true);

      await urlFrontier.addUrls(inputUrl);

      expect(urlDeduplicatorMock.isDuplicate).toHaveBeenCalledWith(inputUrl);

      // Kyunki true aa gaya, function yahi ruk jana chahiye tha, aage nhi jana chahiye
      expect(urlDeduplicatorMock.markAsSeen).not.toHaveBeenCalled();
      expect(queueProviderMock.publishURL).not.toHaveBeenCalled();
    });
  });

  describe("getNextUrl Method Test", () => {
    it("should return seed URLs from the local queue first", async () => {
      // Logic ye hai ki local queue pehle finish hona chahiye
      const firstSeed = seedUrls[0];
      const result = await urlFrontier.getNextUrl();

      expect(result).toBe(firstSeed); // humko seed mila
      expect(queueProviderMock.fetchURL).not.toHaveBeenCalled(); // fetch nhi hua server se kuch bhi
    });

    it("should fetch URLs from queueProvider when local queue is empty", async () => {
      // Chalo local queue ko khaali kar dete hain calls ke through
      for (let i = 0; i < seedUrls.length; i++) {
        await urlFrontier.getNextUrl();
      }

      // Ab sab empty hai. Fetch method se call hogi external cheeze
      const mockTasks: FrontierTask[] = [{ taskId: "1", url: "https://new-url.com" }];
      // Set the mock setup 
      queueProviderMock.fetchURL.mockResolvedValue(mockTasks);

      const result = await urlFrontier.getNextUrl();

      expect(queueProviderMock.fetchURL).toHaveBeenCalledWith(10); // Check karo ki batch array se 10 manga ya nhi
      expect(result).toEqual(mockTasks); // check karo correct object pass hua
    });
  });
});
