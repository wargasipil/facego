
person = {}

def add_person(name: str):
    global person
    person[name] = True

def clear_person():
    global person
    person = {}

def list_person():
    global person
    for name in person.keys():
        p = {
            'name': name,
            'status': True
        }

        yield p