# Task 1

a = int(input("Enter the first value"))
b = int(input("Enter the second value"))
#print("Addition:",a+b,'\n',"Multiplication:",a*b,'\n',"Division:",a/b,'\n',"Subtraction:",a-b)
print(f"Addition: {a+b}\nMultiplication: {a*b}\nSubtraction: {a-b}\nDivision: {a/b if b!=0 else 'undefined'}")