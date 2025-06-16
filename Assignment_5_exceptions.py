
try:
	f='sample.txt'
	with open("f",'r') as file:
		print("Reading file content:")
		line_num=1
		for line in file:
			print(f'Line {line_num}:{line}')
			line_num+=1
except FileNotFoundError:
	print(f"File '{f}' not found")