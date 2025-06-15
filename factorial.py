a=int(input('Enter a number'))
def factorial(x):
	if x<=1:
		return 1
	else:
		return x*factorial(x-1)
y=factorial(a)
print(f'factorial of {a} is {y}')