FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y openssh-server vim sudo && \
    useradd -m ctf && \
    echo 'ctf:ctfpassword' | chpasswd && \
    mkdir /var/run/sshd && \
    echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && \
    echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && \
    echo 'ctf ALL=(ALL) NOPASSWD: /usr/bin/vim' >> /etc/sudoers && \
    echo 'CTF{CL4D_SH4L1N4_R0M4N4_N41DEN}' > /root/flag.txt && \
    chmod 600 /root/flag.txt
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]