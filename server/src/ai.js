import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `You are being used in a game like rock paper scissors, but with custom objects. 
        Your objective is to generate a JSON object representing the relationships between the provided objects. 
        The JSON should have a "success" field (true or false), a "result" array, and an "error" field (null or an error message). 

        The "result" array should contain objects, each with "object" (string), "emoji" (string), "loses_against" (array of strings) "wins_against": (array of strings), and "logic" 
        (string explanation of why this object loses against the other). 

        **IMPORTANT**:
        - Keep it simple, do not overcomplicate the relationships.
        - Ensure there are no contradiction cycles: If A loses against B, B **must not** lose against A.
        - Ensure every object has a valid relationship, meaning no object should be isolated.
        - Ensure every object has a unique emoji.
        - Ensure every object has a relationship with all the other objects.
        - Ensure every object has at least one object it wins against and one object it loses against.
        - If it's impossible to create valid relationships, return "success": false and an error message.

        The response should be a **only one pure JSON object** with no extra text. Format:
        {
          "success": true,
          "result": [
            { "object": "object1", "emoji": "emoji1", "loses_against": ["object2"], "wins_against": ["object2"], "logic": "explanation" },
            { "object": "object2", "emoji": "emoji2", "loses_against": ["object3"], "wins_against": ["object2"], "logic": "explanation" },
            { "object": "object3", "emoji": "emoji3", "loses_against": ["object1"], "wins_against": ["object2"], "logic": "explanation" }
          ],
          "error": null
        }
        `,
});

export async function generateGameLogic(objects) {
    const prompt = `Generate game logic for the following objects: ${objects}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        

        // Intenta parsear la respuesta como JSON
        const parsedResponse = JSON.parse(responseText.match(/\{[\s\S]*\}/)[0]);
        console.log(parsedResponse);
        
        
        // Verifica si la respuesta tiene el formato esperado
        if (parsedResponse && typeof parsedResponse === 'object' && ('success' in parsedResponse)) {
            return parsedResponse;
        } else {
            return {
                "success": false,
                "result": null,
                "error": "La API devolvió un formato JSON inesperado."
            };
        }
    } catch (error) {
        return {
            "success": false,
            "result": null,
            "error": `Error al procesar la respuesta de la API: ${error.message}`
        };
    }
}
