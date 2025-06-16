file = input("Enter text to write to the file:")
with open('output.txt','r+') as file1:
	file1.write(file+'\n')
	print('Data successfully written to output.txt')

files=input("Enter additional text to the file:")
with open('output.txt','a') as file1:
	file1.write(files+'\n')
	print('Data successfully appended to output.txt file')

with open('output.txt','r') as file1:
	a=file1.read()
print(f"Final content of output.txt file:")
print(a,end="")
