import json
import re
import httpx
from app.config import settings

SAMPLES = {
    "python loops": {
        "understand": {"explanation": "A loop repeats a small set of instructions so you don't have to write the same code over and over. A for loop visits each item in a collection; a while loop repeats as long as a condition stays true.", "analogy": "Imagine checking every book on a shelf one by one: a for loop is your predictable shelf walk. A while loop is like stirring soup until it reaches the right thickness.", "example": "for book in bookshelf:\n    read(book)", "code": "prices = [12, 8, 5]\ntotal = 0\nfor price in prices:\n    total += price\nprint(total)  # 25", "key_points": ["for loops iterate over items", "while loops depend on a condition", "Update loop state to avoid infinite loops"], "mistakes": ["Forgetting to update a while-loop condition", "Using the wrong indentation"]},
        "connect": {"concepts": [{"name": "Lists", "description": "Ordered collections of values.", "relation": "Loops visit each list item in sequence.", "use": "Process a shopping cart or set of scores."}, {"name": "Conditions", "description": "Expressions that evaluate to true or false.", "relation": "A while loop uses a condition to decide whether to continue.", "use": "Repeat until a goal is reached."}, {"name": "Functions", "description": "Reusable named blocks of code.", "relation": "A loop can call a function for every item.", "use": "Keep repeated work organized."}, {"name": "Iteration", "description": "The act of repeating a process step by step.", "relation": "A loop is a programming structure for iteration.", "use": "Build algorithms that process data."}, {"name": "Algorithms", "description": "A set of steps for solving a problem.", "relation": "Loops let an algorithm handle many inputs efficiently.", "use": "Search, sort, and aggregate data."}], "relationships": [{"from": "Python Loops", "to": "Lists", "label": "iterate over"}, {"from": "Python Loops", "to": "Conditions", "label": "repeat while"}, {"from": "Python Loops", "to": "Functions", "label": "call per item"}, {"from": "Python Loops", "to": "Iteration", "label": "implements"}, {"from": "Python Loops", "to": "Algorithms", "label": "powers"}]},
        "apply": {"challenge": "You're building a small checkout. Given prices = [12.50, 4.25, 8.00], write a loop that calculates the total and counts how many items cost more than $5. Don't use sum() yet—show how the loop accumulates the result.", "difficulty": "beginner", "hints": ["Think about visiting each price one at a time.", "Which loop structure can process every item in a list?", "Create a total variable before the loop, then update it inside. You can keep a second counter for prices above 5."]},
        "think": {"question": "Why might a while loop be a better fit than a for loop when you're waiting for a user to enter a valid password?"}
    },
    "python lists": {"understand": {"explanation": "A list stores an ordered collection of values that you can change.", "analogy": "A numbered set of labeled drawers; each position has an index starting at zero.", "example": "colors = ['blue', 'gold']\ncolors.append('green')", "code": "scores = [88, 92, 75]\nprint(scores[0])", "key_points": ["Lists preserve order", "Indexes start at zero", "Lists can be changed"], "mistakes": ["Using an index past the end", "Forgetting indexes start at zero"]}, "connect": {"concepts": [{"name":"Loops","description":"Repeat work","relation":"Loops process each list item","use":"Calculate totals"},{"name":"Indexes","description":"Positions in a sequence","relation":"Indexes access list elements","use":"Update one item"},{"name":"Functions","description":"Reusable operations","relation":"Functions can accept and return lists","use":"Transform data"}], "relationships":[]}, "apply": {"challenge":"Given a list of temperatures, find how many are above 20 without using a built-in count function.","difficulty":"beginner","hints":["Start a counter at zero.","Visit each temperature with a loop.","Use an if condition to check whether it is above 20."]}, "think":{"question":"When would changing a list in place be useful, and when might it create a surprising bug?"}},
    "python functions": {"understand":{"explanation":"A function is a named, reusable recipe: give it inputs, let it do a focused job, and optionally get a result back.","analogy":"Like a coffee machine: ingredients go in, a repeatable process runs, and a drink comes out.","example":"def greet(name):\n    return f'Hello, {name}!'","code":"def area(width, height):\n    return width * height\n\nprint(area(4, 3))","key_points":["def defines a function","Parameters receive inputs","return sends a result back"],"mistakes":["Printing instead of returning a value","Calling before defining in unusual execution flows"]},"connect":{"concepts":[{"name":"Parameters","description":"Named inputs","relation":"Functions use parameters to accept data","use":"Reuse behavior for different values"},{"name":"Loops","description":"Repeated execution","relation":"Functions can organize work performed in a loop","use":"Keep iteration logic readable"},{"name":"Scope","description":"Where a name is available","relation":"Function bodies create local scope","use":"Avoid accidental variable collisions"}],"relationships":[]},"apply":{"challenge":"Write a function that accepts a list of prices and returns the total after a 10% discount.","difficulty":"beginner","hints":["Define a function with a prices parameter.","Calculate the total of the prices.","Return the total multiplied by 0.9."]},"think":{"question":"How does splitting a large program into small functions make it easier to test and change?"}},
    "sql basics": {"understand":{"explanation":"SQL is a language for asking structured questions of data stored in tables.","analogy":"Like asking a very organized librarian to find rows matching your criteria.","example":"SELECT name FROM learners WHERE streak > 3;","code":"SELECT category, COUNT(*)\nFROM courses\nGROUP BY category;","key_points":["SELECT chooses columns","FROM chooses a table","WHERE filters rows"],"mistakes":["Forgetting quotes around text values","Filtering aggregated values with WHERE instead of HAVING"]},"connect":{"concepts":[{"name":"Tables","description":"Rows and columns of data","relation":"Queries read and transform table data","use":"Organize related records"},{"name":"Filtering","description":"Selecting matching records","relation":"WHERE applies conditions","use":"Find relevant rows"},{"name":"Aggregation","description":"Summarizing many rows","relation":"GROUP BY combines rows for summaries","use":"Report totals and averages"}],"relationships":[]},"apply":{"challenge":"From an orders table, write a query to show each customer_id and their total order amount, only including customers whose total exceeds 100.","difficulty":"intermediate","hints":["You will need to group rows by customer_id.","Use SUM on the order amount.","Filter grouped results with HAVING."]},"think":{"question":"Why is it important to understand how a database combines rows before using GROUP BY?"}},
    "machine learning basics": {"understand":{"explanation":"Machine learning finds patterns from examples and uses those patterns to make predictions on new data.","analogy":"Like learning to recognize fruit from many labeled examples rather than memorizing a fixed rulebook.","example":"A model learns from emails labeled spam or not spam, then predicts the label for a new email.","code":"features = past_emails\nlabels = spam_labels\nmodel.fit(features, labels)\nprediction = model.predict(new_email)","key_points":["Training uses examples","Features describe inputs","Evaluation checks performance on unseen data"],"mistakes":["Testing on the same data used to train","Assuming correlation proves causation"]},"connect":{"concepts":[{"name":"Data","description":"Examples used by a model","relation":"Models learn patterns from data","use":"Train and evaluate predictions"},{"name":"Algorithms","description":"Procedures that optimize a model","relation":"Learning algorithms adjust model parameters","use":"Fit a predictor"},{"name":"Evaluation","description":"Measuring model performance","relation":"Evaluation tests generalization","use":"Catch overfitting"}],"relationships":[]},"apply":{"challenge":"You have a dataset of house features and sale prices. Describe a sensible first experiment to predict prices and how you would check if it works.","difficulty":"intermediate","hints":["Think about what the model input and target should be.","Keep some examples aside from training.","Compare predictions with true prices using a numerical error measure."]},"think":{"question":"Why can a model with excellent training performance still make poor predictions in the real world?"}}
}


def fallback_lesson(topic: str, level: str) -> dict:
    key = topic.lower().strip()
    sample = SAMPLES.get(key) or SAMPLES["python loops"]
    title = topic.strip().title()
    result = json.loads(json.dumps(sample))
    if key not in SAMPLES:
        result["understand"]["explanation"] = f"{title} is a useful concept. Start by identifying its purpose, the inputs it uses, and the steps it performs. Then connect it to a concrete example and test your understanding by applying it to a small problem."
        result["understand"]["analogy"] = f"Think of {title} as a tool in a workshop: understanding what it is designed for helps you choose it at the right time."
        result["understand"]["example"] = f"A practical example of {title} is solving a small, familiar problem and explaining each step."
        result["understand"]["code"] = ""
        result["apply"]["challenge"] = f"Describe a real-world problem where {title} could help. Outline the inputs, steps, and how you would check the result."
        result["connect"]["concepts"] = [{"name": "Foundations", "description": "The prerequisite ideas that support this topic.", "relation": f"{title} builds on foundational ideas.", "use": "Review prerequisites when a concept feels unclear."}, {"name": "Practice", "description": "Using a concept to solve a concrete problem.", "relation": f"Practice turns {title} into an applicable skill.", "use": "Test knowledge with small scenarios."}, {"name": "Evaluation", "description": "Checking whether a solution meets its goal.", "relation": f"Evaluation measures outcomes of applying {title}.", "use": "Compare a result against expected behavior."}]
        result["connect"]["relationships"] = []
        result["think"]["question"] = f"What assumptions do you make when applying {title}, and how could you test them?"
    result["topic"] = title
    result["level"] = level
    return result


async def ask_ai(system: str, user: str) -> str:
    if settings.ai_provider.lower() in {"demo", "fallback", ""}:
        raise RuntimeError("Demo provider selected")
    base = settings.ai_base_url.rstrip("/")
    url = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.ai_api_key or 'ollama'}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(url, headers=headers, json={"model": settings.ai_model, "temperature": 0.4, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


def parse_json(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.I)
    return json.loads(cleaned)


async def generate_lesson(topic: str, level: str) -> tuple[dict, str]:
    try:
        raw = await ask_ai("You are LearnForge, an expert Socratic learning designer. Return ONLY valid JSON matching: {understand:{explanation,analogy,example,code,key_points[],mistakes[]},connect:{concepts:[{name,description,relation,use}],relationships:[{from,to,label}]},apply:{challenge,difficulty,hints[3]},think:{question}}. Do not reveal challenge solutions.", f"Create an accurate, concise lesson for topic '{topic}' at {level} level. Use 4-6 related concepts and progressive hints.")
        content = parse_json(raw)
        content["topic"] = topic.strip().title()
        content["level"] = level
        return content, "ai"
    except Exception:
        content = fallback_lesson(topic, level)
        return content, "demo"


async def evaluate_answer(topic: str, prompt: str, answer: str) -> dict:
    try:
        raw = await ask_ai("Evaluate learning fairly and constructively. Return JSON: {score:0-100,correct:boolean,strengths:[...],improvement:string,feedback:string}. Assess reasoning and approach, not exact wording. Never expose a full solution unless explicitly requested.", f"Topic: {topic}\nChallenge: {prompt}\nLearner answer: {answer}")
        data = parse_json(raw)
        return {"score": max(0, min(100, float(data["score"]))), "correct": bool(data.get("correct", data.get("score", 0) >= 65)), "strengths": data.get("strengths", []), "improvement": data.get("improvement", "Try explaining the next step."), "feedback": data.get("feedback", "Good effort."), "source": "ai"}
    except Exception:
        terms = set(re.findall(r"[a-zA-Z_]+", answer.lower()))
        score = min(92, 28 + 12 * sum(term in terms for term in ("for", "while", "total", "sum", "if", "return", "select", "group", "loop", "price", "count", "def")))
        return {"score": score, "correct": score >= 60, "strengths": ["You made a concrete attempt and communicated an approach."], "improvement": "Make sure your response clearly shows the repeated step, how state is updated, and how you know the task is complete.", "feedback": "Demo evaluation is based on whether your answer describes a relevant process. Connect each step back to the challenge requirements.", "source": "demo"}


async def evaluate_reasoning(topic: str, question: str, response: str) -> dict:
    try:
        raw = await ask_ai("Assess conceptual reasoning, not keyword matching. Return JSON: {score:0-100,strengths:[...],improvement:string,feedback:string}.", f"Topic: {topic}\nQuestion: {question}\nLearner response: {response}")
        data = parse_json(raw)
        return {"score": max(0, min(100, float(data["score"]))), "strengths": data.get("strengths", []), "improvement": data.get("improvement", "Add an example."), "feedback": data.get("feedback", "Your reasoning is developing."), "source": "ai"}
    except Exception:
        words = len(response.split())
        score = min(84, 30 + words * 2) if words else 0
        return {"score": score, "strengths": ["You engaged with the question."], "improvement": "Support your claim with a concrete example and explain why that example fits.", "feedback": "Demo feedback rewards a clear explanation. Expand on the conditions and trade-offs behind your answer.", "source": "demo"}
